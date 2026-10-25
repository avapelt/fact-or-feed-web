'use client';
import { useState, useEffect, useRef } from 'react';

const STEPS = [
  'Reading what you sent…',
  'Searching 30+ news sources across the spectrum…',
  'Checking official sources and published research…',
  'Spotting persuasion tactics…',
  'Weighing the evidence…',
  'Writing you the real story…',
];

const COLORS = {
  Left: '#1d4ed8',
  'Lean Left': '#60a5fa',
  Center: '#9ca3af',
  'Lean Right': '#f87171',
  Right: '#b91c1c',
  Official: '#16a34a',
  Research: '#7c3aed',
  'Fact-check': '#f59e0b',
  'Not rated': '#d1d5db',
};
const ORDER = Object.keys(COLORS);
const DARK = ['Lean Left', 'Center', 'Lean Right', 'Fact-check', 'Not rated'];

const VERDICTS = ['Accurate', 'Missing context', 'Exaggerated', 'Misleading', 'False'];
const VERDICT_COLORS = ['#16a34a', '#84cc16', '#f59e0b', '#f97316', '#dc2626'];
const AI_LEVELS = ['Low chance of AI', 'Medium chance of AI', 'High chance of AI'];
const AI_COLORS = ['#16a34a', '#f59e0b', '#dc2626'];

// Paste the iCloud link of the Fact or Feed? Shortcut here (Shortcuts app → hold the shortcut → Share → Copy iCloud Link)
const SHORTCUT_URL = '';

const WELCOME = {
  en: "Hey! 👋 I'm Fact or Feed. Send me anything you saw online (a post, a link, or a screenshot) and I'll check 30+ sources and tell you what's actually real.",
  es: '¡Hola! 👋 Soy Fact or Feed. Mándame cualquier cosa que viste en internet (una publicación, un enlace o una captura) y reviso más de 30 fuentes para decirte qué es real.',
  ht: 'Bonjou! 👋 Mwen se Fact or Feed. Voye ban mwen nenpòt bagay ou wè sou entènèt (yon post, yon lyen, oswa yon foto ekran) epi m ap tcheke plis pase 30 sous pou di w sa ki vre.',
};

const CSS = `
.ff{height:100dvh;display:flex;flex-direction:column;background:#f4f1ec;color:#1b1b1f;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.5}
.ff *{box-sizing:border-box}
.top{background:#fff;border-bottom:1px solid #e7e4dc;padding:10px 16px}
.top-in{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:10px}
.av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#ec4899);color:#fff;font-weight:800;display:grid;place-items:center;flex-shrink:0}
.av.sm{width:30px;height:30px;font-size:12px;align-self:flex-end}
.name{font-weight:700;font-size:16px;white-space:nowrap}
.status{font-size:12px;color:#16a34a;white-space:nowrap}
.prefs{margin-left:auto;display:flex;gap:6px}
.prefs select{border:1px solid #e7e4dc;border-radius:999px;padding:6px 8px;font-size:13px;background:#f8f6f1}
.thread{flex:1;overflow-y:auto;padding:16px}
.thread-in{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.msg{display:flex;gap:8px;align-items:flex-end}
.msg.me{justify-content:flex-end}
.bub{max-width:80%;padding:10px 14px;border-radius:20px;background:#fff;border:1px solid #ebe7de;box-shadow:0 1px 1px rgba(0,0,0,.03);overflow-wrap:anywhere}
.bot .bub{border-bottom-left-radius:6px}
.me .bub{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:0;border-bottom-right-radius:6px}
.me .bub a{color:#fff}
.bub.wide{max-width:88%;width:100%}
.bub img.shot{max-width:220px;max-height:260px;border-radius:14px;display:block}
.dots{display:inline-flex;gap:4px;margin-right:8px;vertical-align:middle}
.dots i{width:7px;height:7px;border-radius:50%;background:#a5a3f0;animation:b 1.2s infinite}
.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}
@keyframes b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.typing-step{font-size:14px;color:#6b6b76}
.vchip{display:inline-block;color:#fff;font-weight:800;padding:4px 12px;border-radius:999px;font-size:15px}
.pill{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;background:#eef2ff;color:#3730a3;margin-right:6px}
.muted{color:#6b6b76;font-size:13px}
.warn{background:#fff7e6;border:1px solid #f5d48a;border-radius:12px;padding:8px 12px;margin:8px 0}
.mini{background:#f8f6f1;border-radius:12px;padding:10px 12px;margin-top:10px}
.blk{margin-top:14px}
.blk h4{margin:0 0 6px;font-size:14px}
.more{margin-top:12px;border-top:1px solid #eee9df;padding-top:10px}
.more summary{cursor:pointer;font-weight:700;color:#4f46e5;list-style:none}
.more summary::-webkit-details-marker{display:none}
.ff ul,.ff ol{padding-left:20px;margin:0}
.ff li{margin:3px 0}
.bot a{color:#4f46e5}
.replybox{background:#eef2ff;border-radius:12px;padding:10px 12px;margin:8px 0}
.btn{border:1px solid #e7e4dc;background:#fff;border-radius:999px;padding:6px 14px;font-weight:600;cursor:pointer;font-size:14px}
.err .bub{background:#fdecec;border-color:#f3b4b4;color:#9b1c1c}
.composer{background:#fff;border-top:1px solid #e7e4dc;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
.comp-in{max-width:760px;margin:0 auto}
.preview{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.preview img{height:56px;border-radius:10px}
.preview button{border:0;background:#eee;border-radius:999px;width:24px;height:24px;cursor:pointer}
.bar{display:flex;gap:8px;align-items:flex-end}
.circle{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:20px;cursor:pointer}
.attach{border:1px solid #e7e4dc;background:#fff}
.send{border:0;color:#fff;background:linear-gradient(135deg,#4f46e5,#7c3aed)}
.send:disabled{opacity:.4;cursor:not-allowed}
.input{flex:1;border:1px solid #e7e4dc;border-radius:22px;padding:11px 16px;font-size:16px;resize:none;max-height:140px;font-family:inherit;background:#f8f6f1}
.input:focus{outline:2px solid #4f46e5;border-color:transparent}
.foot{text-align:center;font-size:11px;color:#9a9aa3;margin-top:6px}
.getapp{border:0;border-radius:999px;padding:7px 12px;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(135deg,#4f46e5,#ec4899);cursor:pointer;white-space:nowrap}
.sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;z-index:50}
.sheet{background:#fff;width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));max-height:90dvh;overflow-y:auto}
.sheet h2{margin:0 0 4px;font-size:20px}
.sheet ol{padding-left:22px}
.sheet li{margin:8px 0}
.bigbtn{display:block;text-align:center;text-decoration:none;border:0;width:100%;border-radius:14px;padding:14px;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,#4f46e5,#7c3aed);cursor:pointer;margin:12px 0}
.ghost{background:#f1efe8;color:#1b1b1f}
.step-box{background:#f8f6f1;border-radius:14px;padding:12px 14px;margin-top:12px}
@media (max-width:420px){.status{display:none}.av{width:36px;height:36px;font-size:14px}}
@media (max-width:520px){.getapp{padding:6px 10px;font-size:12px}.prefs select{font-size:12px;padding:5px 6px}.bub.wide{max-width:100%}.name{font-size:15px}}
`;

function Badge({ category }) {
  return (
    <span
      style={{
        background: COLORS[category] || '#d1d5db',
        color: DARK.includes(category) ? '#111' : '#fff',
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        fontWeight: 700,
      }}
    >
      {category}
    </span>
  );
}

function Meter({ labels, colors, active }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
      {labels.map((label, i) => (
        <div key={label} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, lineHeight: 1.2 }}>
          <div style={{ height: 8, borderRadius: 4, background: colors[i], opacity: i === active ? 1 : 0.18 }} />
          <div style={{ fontWeight: i === active ? 700 : 400, marginTop: 3 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function SourceItem({ s }) {
  return (
    <li style={{ marginBottom: 6 }}>
      <Badge category={s.category} />{' '}
      <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>{' '}
      <span className="muted">
        ({s.domain}{s.date ? ', ' + String(s.date).slice(0, 10) : ''})
      </span>
    </li>
  );
}

function Block({ title, children }) {
  return (
    <div className="blk">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function SpectrumBar({ stats, total }) {
  const used = ORDER.filter((c) => stats[c]);
  return (
    <>
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 6 }}>
        {used.map((c) => (
          <div key={c} title={`${c}: ${stats[c]}`} style={{ width: `${(stats[c] / total) * 100}%`, background: COLORS[c] }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {used.map((c) => (
          <span key={c} style={{ fontSize: 12 }}>
            <Badge category={c} /> {stats[c]}
          </span>
        ))}
      </div>
    </>
  );
}

function ResultBubble({ data }) {
  const r = data.result;
  const total = data.sources?.length || 0;
  const vIndex = VERDICTS.indexOf(r.verdict);
  const vColor = vIndex >= 0 ? VERDICT_COLORS[vIndex] : '#6b7280';

  return (
    <div className="bub wide">
      <span className="vchip" style={{ background: vColor }}>{r.verdict}</span>
      {vIndex >= 0 && <Meter labels={VERDICTS} colors={VERDICT_COLORS} active={vIndex} />}

      {r.warning && <div className="warn">⚠️ {r.warning}</div>}

      <p style={{ margin: '12px 0 8px' }}>{r.real_story}</p>
      <p style={{ margin: 0, fontSize: 14 }}>
        <span className="pill">Consensus: {r.consensus.level}</span>
        {r.consensus.explanation}
      </p>

      {data.imageCheck && (
        <div className="mini">
          <b>🤖 Could this image be AI-made?</b>
          <Meter labels={AI_LEVELS} colors={AI_COLORS} active={AI_LEVELS.indexOf(data.imageCheck.level)} />
          {data.imageCheck.signs.length > 0 && (
            <ul style={{ marginTop: 8, fontSize: 14 }}>
              {data.imageCheck.signs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          <div className="muted" style={{ marginTop: 6 }}>
            Warning signs aren't proof. No tool can say for sure if an image is AI-made.
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="mini">
          <b>⚖️ I checked {total} sources</b>
          <SpectrumBar stats={data.stats || {}} total={total} />
        </div>
      )}

      <details className="more">
        <summary>See the full breakdown ↓</summary>

        {r.right_and_wrong.length > 0 && (
          <Block title="❌ What the post got wrong">
            {r.right_and_wrong.map((x, i) => (
              <p key={i} style={{ margin: '0 0 8px', fontSize: 14 }}>
                <b>Post says:</b> {x.post_says}
                <br />
                <b>Actually:</b> {x.actually}
              </p>
            ))}
          </Block>
        )}

        {r.origin_timeline.length > 0 && (
          <Block title="🕒 How this claim spread">
            <ol style={{ fontSize: 14 }}>
              {r.origin_timeline.map((t, i) => (
                <li key={i}>
                  <b>{t.when}:</b> {t.what}
                </li>
              ))}
            </ol>
          </Block>
        )}

        {r.disputed.length > 0 && (
          <Block title="🤔 Sources disagree on">
            <ul style={{ fontSize: 14 }}>
              {r.disputed.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </Block>
        )}

        {r.unknown.length > 0 && (
          <Block title="❓ Still unknown">
            <ul style={{ fontSize: 14 }}>
              {r.unknown.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </Block>
        )}

        {r.persuasion_tactics.length > 0 && (
          <Block title="🎣 How it tries to persuade you">
            <ul style={{ fontSize: 14 }}>
              {r.persuasion_tactics.map((t, i) => (
                <li key={i}>
                  <b>{t.tactic}</b> ({t.where}): {t.explanation}
                </li>
              ))}
            </ul>
          </Block>
        )}

        <Block title="🧠 How I figured this out">
          <ol style={{ fontSize: 14 }}>
            {r.how_we_figured_it_out.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Block>

        {data.trace && (
          <Block title="⚙️ What I did behind the scenes">
            <ol style={{ fontSize: 14 }}>
              {data.trace.timings.map((t, i) => (
                <li key={i}>
                  {t.label} <span className="muted">({t.seconds}s)</span>
                </li>
              ))}
            </ol>
            <details style={{ marginTop: 6, fontSize: 14 }}>
              <summary style={{ cursor: 'pointer' }}>Searches I ran</summary>
              <ul>
                {[...data.trace.queries.news, ...data.trace.queries.official, ...data.trace.queries.research].map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </details>
          </Block>
        )}

        {data.keySources?.length > 0 && (
          <Block title="📚 Most important sources">
            <ul style={{ fontSize: 14 }}>
              {data.keySources.map((s) => (
                <SourceItem key={s.id} s={s} />
              ))}
            </ul>
          </Block>
        )}

        {total > 0 && (
          <Block title={`🗂️ All ${total} sources I read`}>
            <ul style={{ fontSize: 14 }}>
              {data.sources.map((s) => (
                <SourceItem key={s.id} s={s} />
              ))}
            </ul>
            <div className="muted" style={{ marginTop: 6 }}>
              Bias labels are approximate, based on published media bias ratings.
            </div>
          </Block>
        )}
      </details>
    </div>
  );
}

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(file);
  });
}

function splitInput(raw) {
  const value = (raw || '').trim();
  const match = value.match(/https?:\/\/\S+/i);
  if (!match) return { text: value, url: '' };
  if (match[0] === value) return { text: '', url: value };
  return { text: value, url: match[0] };
}

function decodeResult(packed) {
  const b64 = packed.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function InstallSheet({ platform, installEvent, onClose }) {
  const [tab, setTab] = useState(platform === 'android' ? 'android' : 'ios');

  async function installAndroid() {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    onClose();
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>📲 Put Fact or Feed? on your phone</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Then when you see a sketchy post anywhere, just tap <b>Share → Fact or Feed?</b>
        </p>

        <div className="tabs" style={{ display: 'flex', gap: 6, background: '#f1efe8', padding: 4, borderRadius: 12 }}>
          {['ios', 'android'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                border: 0,
                padding: 8,
                borderRadius: 9,
                fontWeight: 700,
                cursor: 'pointer',
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#1b1b1f' : '#6b6b76',
              }}
            >
              {t === 'ios' ? '📱 iPhone' : '🤖 Android'}
            </button>
          ))}
        </div>

        {tab === 'ios' && (
          <>
            {SHORTCUT_URL ? (
              <a className="bigbtn" href={SHORTCUT_URL} target="_blank" rel="noreferrer">
                Add the Fact or Feed? shortcut
              </a>
            ) : (
              <div className="bigbtn ghost">iPhone shortcut coming soon</div>
            )}
            <div className="step-box">
              <b>How it works</b>
              <ol>
                <li>Tap the button above, then <b>Add Shortcut</b>.</li>
                <li>On any post, screenshot, or article, tap <b>Share</b>.</li>
                <li>Scroll down and tap <b>Fact or Feed?</b></li>
              </ol>
            </div>
            <div className="step-box">
              <b>Also add the app to your Home Screen</b>
              <ol>
                <li>Open this site in <b>Safari</b>.</li>
                <li>Tap <b>Share</b> (the square with the arrow).</li>
                <li>Tap <b>Add to Home Screen</b>.</li>
              </ol>
            </div>
          </>
        )}

        {tab === 'android' && (
          <>
            {installEvent ? (
              <button className="bigbtn" onClick={installAndroid}>Install Fact or Feed?</button>
            ) : (
              <div className="step-box">
                <b>Install the app</b>
                <ol>
                  <li>Open this site in <b>Chrome</b>.</li>
                  <li>Tap the <b>⋮</b> menu at the top right.</li>
                  <li>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</li>
                </ol>
              </div>
            )}
            <div className="step-box">
              <b>Then use it from any app</b>
              <ol>
                <li>On a post or article, tap <b>Share</b>.</li>
                <li>Pick <b>Fact or Feed?</b> from the list.</li>
                <li>It opens and starts checking right away.</li>
              </ol>
            </div>
          </>
        )}

        <button className="bigbtn ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

let nextId = 1;

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState(null);
  const [audience, setAudience] = useState('teen');
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [platform, setPlatform] = useState('desktop');
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios');
    else if (/Android/i.test(ua)) setPlatform('android');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, step]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 8000);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    // A full result handed over from the iPhone popup (no need to check again)
    const hash = window.location.hash;
    if (hash.startsWith('#r=')) {
      window.history.replaceState(null, '', window.location.pathname);
      try {
        const data = decodeResult(hash.slice(3));
        add({ from: 'me', text: '📲 Shared from my phone' });
        add({ from: 'bot', kind: 'result', data });
        add({ from: 'bot', kind: 'reply', text: data.result.reply_draft });
      } catch {
        add({ from: 'bot', kind: 'error', text: "I couldn't open that result. Try sharing it again." });
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const q =
      params.get('q') ||
      [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join(' ');
    if (!q) return;
    window.history.replaceState(null, '', window.location.pathname);
    send(q, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(msg) {
    setMessages((m) => [...m, { id: nextId++, ...msg }]);
  }

  async function send(rawText, img) {
    const { text, url } = splitInput(rawText);
    if (!text && !url && !img) return;
    if (loading) return;

    add({ from: 'me', text: (rawText || '').trim(), image: img });
    setDraft('');
    setImage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url, image: img, audience, language }),
      });
      const data = await res.json();
      if (data.error || !data.result) {
        add({ from: 'bot', kind: 'error', text: data.error || 'Something went wrong. Try again?' });
      } else {
        add({ from: 'bot', kind: 'result', data });
        add({ from: 'bot', kind: 'reply', text: data.result.reply_draft });
      }
    } catch {
      add({ from: 'bot', kind: 'error', text: "I couldn't reach the server. Check your connection and try again." });
    }
    setLoading(false);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(await compressImage(file));
    e.target.value = '';
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(draft, image);
    }
  }

  function copy(id, text) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
  }

  const welcome = WELCOME[language] || WELCOME.en;
  const canSend = !loading && (draft.trim() || image);

  return (
    <div className="ff">
      <style>{CSS}</style>

      <header className="top">
        <div className="top-in">
          <div className="av">F?</div>
          <div>
            <div className="name">Fact or Feed?</div>
            <div className="status">{loading ? 'checking sources…' : '● your fact-checking friend'}</div>
          </div>
          <div className="prefs">
            <button className="getapp" onClick={() => setShowInstall(true)}>📲 Get it</button>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="Who's asking">
              <option value="teen">Teen</option>
              <option value="adult">Adult</option>
            </select>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
              <option value="auto">Auto</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="ht">HT</option>
            </select>
          </div>
        </div>
      </header>

      <div className="thread">
        <div className="thread-in">
          <div className="msg bot">
            <div className="av sm">F?</div>
            <div className="bub">{welcome}</div>
          </div>

          {messages.map((m) => {
            if (m.from === 'me') {
              return (
                <div key={m.id} className="msg me">
                  <div className="bub">
                    {m.image && <img className="shot" src={m.image} alt="What you sent" />}
                    {m.text && <div style={{ marginTop: m.image ? 8 : 0 }}>{m.text}</div>}
                  </div>
                </div>
              );
            }
            if (m.kind === 'result') {
              return (
                <div key={m.id} className="msg bot">
                  <div className="av sm">F?</div>
                  <ResultBubble data={m.data} />
                </div>
              );
            }
            if (m.kind === 'reply') {
              return (
                <div key={m.id} className="msg bot">
                  <div className="av sm">F?</div>
                  <div className="bub">
                    Want to reply to whoever sent it? You could say:
                    <div className="replybox">{m.text}</div>
                    <button className="btn" onClick={() => copy(m.id, m.text)}>
                      {copiedId === m.id ? '✓ Copied!' : 'Copy message'}
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className="msg bot err">
                <div className="av sm">F?</div>
                <div className="bub">{m.text}</div>
              </div>
            );
          })}

          {loading && (
            <div className="msg bot">
              <div className="av sm">F?</div>
              <div className="bub">
                <span className="dots"><i /><i /><i /></span>
                <span className="typing-step">{STEPS[step]}</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <footer className="composer">
        <div className="comp-in">
          {image && (
            <div className="preview">
              <img src={image} alt="Photo to send" />
              <button onClick={() => setImage(null)} aria-label="Remove photo">×</button>
            </div>
          )}
          <div className="bar">
            <button className="circle attach" onClick={() => fileRef.current?.click()} aria-label="Add a photo">
              📎
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            <textarea
              className="input"
              rows={1}
              placeholder="Paste a post or link…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="circle send" onClick={() => send(draft, image)} disabled={!canSend} aria-label="Send">
              ↑
            </button>
          </div>
          <div className="foot">Fact or Feed? uses AI and can make mistakes. Always check the sources.</div>
        </div>
      </footer>

      {showInstall && (
        <InstallSheet platform={platform} installEvent={installEvent} onClose={() => setShowInstall(false)} />
      )}
    </div>
  );
}
