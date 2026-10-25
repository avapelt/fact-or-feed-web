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
  Left: '#2f4a6d',
  'Lean Left': '#8fa5c2',
  Center: '#b3ad9c',
  'Lean Right': '#d29a86',
  Right: '#8c2f1f',
  Official: '#4f6b3a',
  Research: '#6b5a8e',
  'Fact-check': '#c9a03a',
  'Not rated': '#d9d2c1',
};
const ORDER = Object.keys(COLORS);
const DARK = ['Lean Left', 'Center', 'Lean Right', 'Fact-check', 'Not rated'];

const VERDICTS = ['Accurate', 'Missing context', 'Exaggerated', 'Misleading', 'False'];
const VERDICT_COLORS = ['#4f6b3a', '#9a9a2e', '#c08a2e', '#b0602f', '#8c2f1f'];
const AI_LEVELS = ['Low chance of AI', 'Medium chance of AI', 'High chance of AI'];
const AI_COLORS = ['#4f6b3a', '#c08a2e', '#8c2f1f'];

// iCloud link of the Fact or Feed? Shortcut (Shortcuts app → hold the shortcut → Share → Copy iCloud Link)
const SHORTCUT_URL = 'https://www.icloud.com/shortcuts/b8d2bacab3a542ffb17e0c96143b1500';

// iCloud link of the "Fact or Feed? (photo)" Shortcut, for sharing screenshots and photos
const PHOTO_SHORTCUT_URL = '';

const WELCOME = {
  en: "Hey! 👋 I'm Vera, your fact-checking friend. Send me anything you saw online (a post, a link, or a screenshot) and I'll check 30+ sources and tell you what's actually real.",
  es: '¡Hola! 👋 Soy Vera, tu amiga que verifica los hechos. Mándame cualquier cosa que viste en internet (una publicación, un enlace o una captura) y reviso más de 30 fuentes para decirte qué es real de verdad.',
  ht: 'Bonjou! 👋 Mwen se Vera, zanmi w ki verifye enfòmasyon. Voye ban mwen nenpòt bagay ou wè sou entènèt (yon post, yon lyen, oswa yon foto ekran) epi m ap tcheke plis pase 30 sous pou di w sa ki vre.',
  zh: '你好！👋 我是 Vera，你的事实核查好朋友。把你在网上看到的任何内容（帖子、链接或截图）发给我，我会查阅 30 多个来源，告诉你什么才是真的。',
  hi: 'नमस्ते! 👋 मैं वेरा हूँ, आपकी फ़ैक्ट-चेक करने वाली दोस्त। ऑनलाइन देखी कोई भी चीज़ (पोस्ट, लिंक या स्क्रीनशॉट) मुझे भेजें, और मैं 30 से ज़्यादा स्रोतों की जाँच करके बताऊँगी कि असल में क्या सच है।',
  ar: 'مرحبًا! 👋 أنا فيرا، صديقتك في التحقق من الحقائق. أرسل لي أي شيء رأيته على الإنترنت (منشور أو رابط أو لقطة شاشة) وسأتحقق من أكثر من 30 مصدرًا لأخبرك بما هو حقيقي فعلًا.',
  fr: "Salut ! 👋 Je suis Vera, ton amie qui vérifie les infos. Envoie-moi tout ce que tu as vu en ligne (une publication, un lien ou une capture d'écran) et je vérifie plus de 30 sources pour te dire ce qui est vraiment vrai.",
  bn: 'হ্যালো! 👋 আমি ভেরা, তোমার ফ্যাক্ট-চেক করার বন্ধু। অনলাইনে দেখা যেকোনো কিছু (পোস্ট, লিংক বা স্ক্রিনশট) আমাকে পাঠাও, আমি ৩০টিরও বেশি সূত্র যাচাই করে বলে দেব আসলে কোনটা সত্যি।',
};

// Shown in the language menu
// The 🌐 globe shows people they can tap here to change the language
const LANGUAGES = [
  ['auto', '🌐'],
  ['en', '🌐 EN'],
  ['es', '🌐 ES'],
  ['ht', '🌐 HT'],
  ['zh', '🌐 中文'],
  ['hi', '🌐 हिन्दी'],
  ['ar', '🌐 عربي'],
  ['fr', '🌐 FR'],
  ['bn', '🌐 বাংলা'],
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');

.ff{
  --cream:#efeadf; --paper:#f7f4ec; --sand:#e4dccb; --line:#d6cdb8; --ink:#1c1a17; --muted:#6f6858;
  --moss:#4f6b3a; --moss-dk:#3d5530; --sage:#a9b48f; --olive:#8f7f45; --rust:#7a4426;
  --chartreuse:#c3c13d; --lavender:#d8d5ec;
  --serif:'DM Serif Display',Georgia,serif; --caslon:'Libre Caslon Text',Georgia,serif;
  --sans:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;
  height:100dvh;display:flex;flex-direction:column;background:var(--cream);color:var(--ink);font-family:var(--sans);line-height:1.5
}
.ff *{box-sizing:border-box}

/* Header */
.top{background:var(--cream);border-bottom:1.5px solid var(--ink);padding:12px 16px}
.top-in{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:12px}
.av{width:44px;height:44px;border-radius:50%;background:var(--rust);color:var(--cream);font-family:var(--serif);font-size:18px;display:grid;place-items:center;flex-shrink:0}
.av.sm{width:30px;height:30px;font-size:13px;align-self:flex-end;background:var(--olive)}
.name{font-family:var(--serif);font-size:26px;line-height:1;letter-spacing:.5px;text-transform:uppercase}
.status{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--moss);margin-top:4px;font-weight:600}
.prefs{margin-left:auto;display:flex;gap:6px}
.prefs select{border:1px solid var(--ink);border-radius:0;padding:6px 10px;font-size:12px;letter-spacing:1px;text-transform:uppercase;background:var(--cream);color:var(--ink);font-family:var(--sans);cursor:pointer}

/* Scrolling ticker */
.ticker{overflow:hidden;white-space:nowrap;border-bottom:1.5px solid var(--ink);background:var(--paper);padding:7px 0}
.ticker-track{display:inline-block;animation:tick 30s linear infinite;font-size:12px;letter-spacing:1.5px;font-weight:600}
.ticker-track em{font-family:var(--caslon);font-style:italic;font-weight:400;font-size:13px}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Thread */
.thread{flex:1;overflow-y:auto;padding:20px 16px}
.thread-in{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.msg{display:flex;gap:8px;align-items:flex-end}
.msg.me{justify-content:flex-end}
.bub{max-width:80%;padding:12px 16px;border-radius:18px;background:var(--paper);border:1px solid var(--line);overflow-wrap:anywhere}
.bot .bub{border-bottom-left-radius:4px}
.me .bub{background:var(--moss);color:var(--cream);border:0;border-bottom-right-radius:4px}
.me .bub a{color:var(--cream)}
.bub.wide{max-width:88%;width:100%}
.bub img.shot{max-width:220px;max-height:260px;border-radius:12px;display:block}

.dots{display:inline-flex;gap:4px;margin-right:8px;vertical-align:middle}
.dots i{width:7px;height:7px;border-radius:50%;background:var(--olive);animation:b 1.2s infinite}
.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}
@keyframes b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.typing-step{font-family:var(--caslon);font-style:italic;font-size:14px;color:var(--muted)}

/* Result pieces */
.vchip{display:inline-block;color:var(--cream);font-family:var(--serif);font-size:20px;letter-spacing:.5px;text-transform:uppercase;padding:4px 14px;border-radius:0}
.pill{display:inline-block;padding:2px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700;background:var(--sage);color:var(--ink);margin-right:6px}
.muted{color:var(--muted);font-size:13px}
.warn{background:#f3e7c4;border-left:4px solid var(--chartreuse);padding:8px 12px;margin:8px 0}
.mini{background:var(--sand);padding:12px 14px;margin-top:12px}
.mini b{font-family:var(--caslon)}
.blk{margin-top:16px}
.blk h4{margin:0 0 6px;font-family:var(--caslon);font-size:16px;font-weight:700}
.more{margin-top:14px;border-top:1px solid var(--ink);padding-top:10px}
.more summary{cursor:pointer;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:var(--moss);list-style:none}
.more summary::-webkit-details-marker{display:none}
.ff ul,.ff ol{padding-left:20px;margin:0}
.ff li{margin:3px 0}
.bot a{color:var(--rust);text-underline-offset:2px}
.replybox{background:var(--lavender);padding:10px 14px;margin:8px 0;font-family:var(--caslon);font-style:italic}
.btn{border:1px solid var(--ink);background:transparent;border-radius:0;padding:7px 16px;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;cursor:pointer;color:var(--ink)}
.btn:hover{background:var(--ink);color:var(--cream)}
.err .bub{background:#f2dcd3;border-color:#d7a896;color:#7a2a1a}

/* Composer */
.composer{background:var(--cream);border-top:1.5px solid var(--ink);padding:12px 12px calc(12px + env(safe-area-inset-bottom))}
.comp-in{max-width:760px;margin:0 auto}
.preview{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.preview img{height:56px;border-radius:8px}
.preview button{border:0;background:var(--sand);border-radius:999px;width:24px;height:24px;cursor:pointer}
.bar{display:flex;gap:8px;align-items:flex-end}
.circle{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:20px;cursor:pointer}
.attach{border:1px solid var(--ink);background:var(--paper)}
.send{border:0;color:var(--cream);background:var(--moss)}
.send:hover:not(:disabled){background:var(--moss-dk)}
.send:disabled{opacity:.35;cursor:not-allowed}
.input{flex:1;border:1px solid var(--line);border-radius:22px;padding:11px 16px;font-size:16px;resize:none;max-height:140px;font-family:inherit;background:var(--paper);color:var(--ink)}
.input::placeholder{color:var(--muted);font-family:var(--caslon);font-style:italic}
.input:focus{outline:2px solid var(--moss);border-color:transparent}
.foot{text-align:center;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:8px}

.prefs select.lang{width:84px}
@media (max-width:540px){.prefs select.lang{width:66px}}
@media (max-width:400px){.prefs select.lang{width:56px}.prefs select{max-width:60px}}
/* Install ("Get it") button + sheet */
.getapp{border:1px solid var(--ink);border-radius:0;padding:6px 10px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;background:var(--moss);color:var(--cream);font-family:var(--sans);cursor:pointer;white-space:nowrap}
.getapp:hover{background:var(--moss-dk)}
.sheet-bg{position:fixed;inset:0;background:rgba(28,26,23,.5);display:flex;align-items:flex-end;justify-content:center;z-index:50}
.sheet{background:var(--paper);width:100%;max-width:520px;border-top:1.5px solid var(--ink);padding:22px 20px calc(22px + env(safe-area-inset-bottom));max-height:90dvh;overflow-y:auto}
.sheet h2{margin:0 0 6px;font-family:var(--serif);font-weight:400;font-size:26px;text-transform:uppercase;letter-spacing:.5px}
.sheet ol{padding-left:22px}
.sheet li{margin:8px 0}
.stabs{display:flex;border:1px solid var(--ink)}
.stab{flex:1;border:0;padding:9px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;cursor:pointer;background:transparent;color:var(--muted);font-family:var(--sans)}
.stab.on{background:var(--ink);color:var(--cream)}
.bigbtn{display:block;text-align:center;text-decoration:none;border:1px solid var(--ink);width:100%;padding:14px;font-size:13px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:var(--cream);background:var(--moss);cursor:pointer;margin:14px 0;font-family:var(--sans)}
.bigbtn:hover{background:var(--moss-dk)}
.bigbtn.ghost{background:transparent;color:var(--ink)}
.step-box{background:var(--sand);padding:12px 14px;margin-top:12px}
.step-box b:first-child{font-family:var(--caslon)}
.name,.status{white-space:nowrap}
@media (max-width:540px){.status{display:none}.av{width:36px;height:36px;font-size:15px}.name{font-size:17px !important}.top-in{gap:8px}.getapp .lbl{display:none}.prefs{gap:4px}.prefs select{padding:5px 4px !important;font-size:10.5px !important;letter-spacing:.5px}}
@media (max-width:520px){.getapp{padding:5px 8px;font-size:11px}.prefs select{font-size:11px;padding:5px 6px}.bub.wide{max-width:100%}.name{font-size:20px}}
`;

function Badge({ category }) {
  return (
    <span
      style={{
        background: COLORS[category] || '#d9d2c1',
        color: DARK.includes(category) ? '#1c1a17' : '#efeadf',
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
  const vColor = vIndex >= 0 ? VERDICT_COLORS[vIndex] : '#6f6858';

  return (
    <div className="bub wide">
      <span className="vchip" style={{ background: vColor }}>{r.verdict}</span>
      {vIndex >= 0 && <Meter labels={VERDICTS} colors={VERDICT_COLORS} active={vIndex} />}

      {r.warning && <div className="warn">⚠️ {r.warning}</div>}

      <p dir="auto" style={{ margin: '12px 0 8px' }}>{r.real_story}</p>
      <p dir="auto" style={{ margin: 0, fontSize: 14 }}>
        <span className="pill">Consensus: {r.consensus.level}</span>
        {r.consensus.explanation}
      </p>

      {data.imageCheck && (
        <div className="mini">
          <b>🤖 Could this image be AI-made?</b>
          <Meter labels={AI_LEVELS} colors={AI_COLORS} active={AI_LEVELS.indexOf(data.imageCheck.level)} />
          {data.imageCheck.plausibility && (
            <div style={{ marginTop: 10, fontSize: 14 }}>
              🎯 <b>How believable is this scene?</b> {data.imageCheck.plausibility}
              {data.imageCheck.plausibility_reason ? `: ${data.imageCheck.plausibility_reason}` : ''}
            </div>
          )}
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
        <h2>Put it on your phone</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          See a sketchy post anywhere? Just tap <b>Share → Fact or Feed?</b>
        </p>

        <div className="stabs">
          <button className={`stab ${tab === 'ios' ? 'on' : ''}`} onClick={() => setTab('ios')}>📱 iPhone</button>
          <button className={`stab ${tab === 'android' ? 'on' : ''}`} onClick={() => setTab('android')}>🤖 Android</button>
        </div>

        {tab === 'ios' && (
          <>
            <a className="bigbtn" href={SHORTCUT_URL} target="_blank" rel="noreferrer">
              Add the Fact or Feed? shortcut
            </a>
            {PHOTO_SHORTCUT_URL && (
              <a className="bigbtn ghost" href={PHOTO_SHORTCUT_URL} target="_blank" rel="noreferrer" style={{ marginTop: -4 }}>
                Add the photo &amp; screenshot shortcut
              </a>
            )}
            <div className="step-box">
              <b>How it works</b>
              <ol>
                <li>Tap the button above, then <b>Add Shortcut</b>.</li>
                <li>On any post, link, or article, tap <b>Share</b>.</li>
                <li>Scroll down and tap <b>Fact or Feed?</b> It opens and starts checking right away.</li>
                <li>
                  For a screenshot or photo, share it to <b>Fact or Feed? (photo)</b>, or open Fact or Feed? and tap <b>📎</b>.
                </li>
              </ol>
            </div>
            <div className="step-box">
              <b>Add the app to your Home Screen</b>
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
    const sharedPhoto = params.get('img');
    if (!q && !sharedPhoto) return;
    window.history.replaceState(null, '', window.location.pathname);
    send(q, null, sharedPhoto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(msg) {
    setMessages((m) => [...m, { id: nextId++, ...msg }]);
  }

  async function send(rawText, img, imageUrl = null) {
    const { text, url } = splitInput(rawText);
    if (!text && !url && !img && !imageUrl) return;
    if (loading) return;

    add({ from: 'me', text: (rawText || '').trim(), image: img || imageUrl });
    setDraft('');
    setImage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url, image: img, imageUrl, audience, language }),
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
            <button className="getapp" onClick={() => setShowInstall(true)} aria-label="Get it on your phone">
              📲<span className="lbl"> Get it</span>
            </button>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="Who's asking">
              <option value="teen">Teen</option>
              <option value="adult">Adult</option>
            </select>
            <select className="lang" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Change language" title="Change language">
              {LANGUAGES.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i}>IS THIS <em>FOR REAL?</em> &nbsp;•&nbsp; </span>
          ))}
        </div>
      </div>

      <div className="thread">
        <div className="thread-in">
          <div className="msg bot">
            <div className="av sm">F?</div>
            <div className="bub" dir="auto">{welcome}</div>
          </div>

          {messages.map((m) => {
            if (m.from === 'me') {
              return (
                <div key={m.id} className="msg me">
                  <div className="bub">
                    {m.image && <img className="shot" src={m.image} alt="What you sent" />}
                    {m.text && <div dir="auto" style={{ marginTop: m.image ? 8 : 0 }}>{m.text}</div>}
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
                    <div className="replybox" dir="auto">{m.text}</div>
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
              dir="auto"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="circle send" onClick={() => send(draft, image)} disabled={!canSend} aria-label="Send">
              ↑
            </button>
          </div>
          <div className="foot">
            Fact or Feed? uses AI and can make mistakes. Always check the sources. ·{' '}
            <a href="/how-it-works" style={{ color: 'var(--moss)', fontWeight: 700 }}>How we check</a>
          </div>
        </div>
      </footer>

      {showInstall && (
        <InstallSheet platform={platform} installEvent={installEvent} onClose={() => setShowInstall(false)} />
      )}
    </div>
  );
}

