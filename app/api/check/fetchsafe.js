// 🛡️ Safe link reading: only public http(s) addresses, checked again after every redirect,
// with a size cap and one timeout that also covers reading the body.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function v4ToInt(ip) {
  return ip.split('.').reduce((n, p) => n * 256 + Number(p), 0);
}
const V4_BLOCKS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => [v4ToInt(base), bits]);

function blockedV4(ip) {
  const n = v4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => Math.floor(n / 2 ** (32 - bits)) === Math.floor(base / 2 ** (32 - bits)));
}

// Expands an IPv6 address to 8 numbers (handles "::" and a dotted IPv4 tail)
function v6Parts(ip) {
  let s = ip.toLowerCase().split('%')[0];
  const tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const n = v4ToInt(tail[1]);
    s = s.slice(0, -tail[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, rest] = s.split('::');
  const h = head ? head.split(':') : [];
  const r = rest !== undefined && rest ? rest.split(':') : [];
  const fill = s.includes('::') ? Array(8 - h.length - r.length).fill('0') : [];
  return [...h, ...fill, ...r].map((x) => parseInt(x || '0', 16));
}

// true for private, loopback, link-local, metadata, and other non-public addresses
export function isBlockedIp(ip) {
  const addr = String(ip || '').replace(/^\[|\]$/g, '');
  const kind = isIP(addr);
  if (kind === 4) return blockedV4(addr);
  if (kind !== 6) return true; // not an IP at all: refuse
  const p = v6Parts(addr);
  if (p.length !== 8) return true;
  const v4 = (a, b) => `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  if (p.slice(0, 7).every((x) => x === 0)) return true; // :: and ::1
  if (p.slice(0, 5).every((x) => x === 0) && p[5] === 0xffff) return blockedV4(v4(p[6], p[7])); // ::ffff:a.b.c.d
  if (p.slice(0, 6).every((x) => x === 0)) return blockedV4(v4(p[6], p[7])); // old ::a.b.c.d
  if (p[0] === 0x64 && p[1] === 0xff9b) return blockedV4(v4(p[6], p[7])); // NAT64
  if (p[0] === 0x2002) return blockedV4(v4(p[1], p[2])); // 6to4
  if ((p[0] & 0xfe00) === 0xfc00) return true; // unique local fc00::/7 (incl. AWS fd00:ec2::254)
  if ((p[0] & 0xffc0) === 0xfe80 || (p[0] & 0xffc0) === 0xfec0) return true; // link-local, site-local
  if ((p[0] & 0xff00) === 0xff00) return true; // multicast
  if (p[0] === 0x2001 && p[1] === 0x0db8) return true; // documentation
  if (p[0] === 0x2001 && p[1] === 0) return true; // Teredo
  return false;
}

// Throws unless the link is http(s) to a public address. WHATWG URL parsing already turns
// tricks like http://2130706433/ or http://0x7f.1/ into 127.0.0.1, which is then blocked.
export async function assertPublicUrl(raw, resolve = lookup) {
  let u;
  try {
    u = new URL(String(raw));
  } catch {
    throw new Error('bad url');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('blocked protocol');
  if (u.username || u.password) throw new Error('blocked credentials');
  const host = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) throw new Error('blocked host');
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error('blocked address');
    return u;
  }
  const addrs = await resolve(host, { all: true, verbatim: true });
  if (!addrs?.length || addrs.some((a) => isBlockedIp(a.address))) throw new Error('blocked address');
  return u;
}

// Fetches a public page. Redirects are followed by hand (at most 3), each checked again.
// Returns { url, status, headers, bytes } or throws. Note: a DNS answer could still change between
// our check and the fetch (DNS rebinding); this closes the common holes cheaply.
export async function safeFetch(url, { headers = {}, maxBytes = 2 * 1024 * 1024, timeoutMs = 8000, maxRedirects = 3 } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = String(url);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const u = await assertPublicUrl(current);
    const res = await fetch(u.href, { headers, redirect: 'manual', signal });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel().catch(() => {});
      current = new URL(res.headers.get('location'), u.href).href;
      continue;
    }
    if (Number(res.headers.get('content-length') || 0) > maxBytes) {
      await res.body?.cancel().catch(() => {});
      throw new Error('too big');
    }
    const chunks = [];
    let total = 0;
    if (res.body) {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          break; // keep what fits (enough for a page's text)
        }
        chunks.push(value);
      }
    }
    return { url: u.href, status: res.status, ok: res.ok, headers: res.headers, bytes: Buffer.concat(chunks), truncated: total > maxBytes };
  }
  throw new Error('too many redirects');
}
