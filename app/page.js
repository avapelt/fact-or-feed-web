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
  Left: '#3B5BA9',
  'Lean Left': '#8EA6D9',
  Center: '#B9B6C2',
  'Lean Right': '#E3A397',
  Right: '#B5402F',
  Official: '#2F8F5B',
  Research: '#5B3FA6',
  'Fact-check': '#D99A2B',
  'Not rated': '#E2E0E6',
};
const ORDER = Object.keys(COLORS);
const DARK = ['Lean Left', 'Center', 'Lean Right', 'Fact-check', 'Not rated'];

const VERDICTS = ['Accurate', 'Missing context', 'Exaggerated', 'Misleading', 'False'];
const VERDICT_COLORS = ['#2F8F5B', '#7FA83A', '#D99A2B', '#D9702F', '#C2413B'];
const AI_LEVELS = ['Low chance of AI', 'Medium chance of AI', 'High chance of AI'];
const AI_COLORS = ['#2F8F5B', '#D99A2B', '#C2413B'];

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
// "Language" tells people they can tap here to change it
const LANGUAGES = [
  ['auto', 'Language'],
  ['en', 'English'],
  ['es', 'Español'],
  ['ht', 'Kreyòl'],
  ['zh', '中文'],
  ['hi', 'हिन्दी'],
  ['ar', 'عربي'],
  ['fr', 'Français'],
  ['bn', 'বাংলা'],
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

/* Matches the Fact or Feed? deck: warm white, near-black ink, one purple accent, Poppins */
.ff{
  --cream:#FBFAF6; --paper:#FFFFFF; --sand:#F4F1FA; --line:#E7E4EC; --ink:#1D1D1F; --muted:#6B6A73;
  --moss:#5B3FA6; --moss-dk:#4A3189; --sage:#E9E4F5; --olive:#5B3FA6; --rust:#1D1D1F;
  --chartreuse:#CFC6EA; --lavender:#E9E4F5; --soft:#8C8A94;
  --serif:'Poppins',ui-sans-serif,system-ui,sans-serif; --caslon:'Poppins',ui-sans-serif,system-ui,sans-serif;
  --sans:'Poppins',ui-sans-serif,system-ui,-apple-system,sans-serif;
  height:100dvh;display:flex;flex-direction:column;background:var(--cream);color:var(--ink);font-family:var(--sans);line-height:1.55
}
.ff *{box-sizing:border-box}

/* Logo: lowercase wordmark with a purple question mark */
.wordmark{font-family:var(--sans);font-weight:800;letter-spacing:-0.035em;line-height:1;color:var(--ink);white-space:nowrap}
.wordmark span{color:var(--moss)}
.kicker{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:600;color:var(--ink)}
.kicker i{width:7px;height:7px;border-radius:50%;background:var(--moss);display:inline-block;flex-shrink:0}

/* Header */
.top{background:#EFEAFA;border-bottom:1px solid #DCD4F0;padding:14px 16px}
.top-in{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:12px}
.top .wordmark{font-size:40px}
.top-in{flex-wrap:wrap}
.prefs{align-items:center}
.howlink{font-size:12px;font-weight:500;color:var(--ink);text-decoration:none;padding:6px 12px;border-radius:999px;white-space:nowrap;border:1px solid var(--line);background:var(--paper);line-height:1.5}
.howlink:hover{border-color:var(--moss);color:var(--moss)}
.av{width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--cream);font-weight:700;font-size:16px;display:grid;place-items:center;flex-shrink:0}
.av.sm{width:30px;height:30px;font-size:12px;align-self:flex-end;background:var(--moss);color:#fff}
.name{font-weight:800;font-size:24px;line-height:1;letter-spacing:-0.03em}
.status{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink);margin-top:6px;font-weight:600;display:flex;align-items:center;gap:6px}
.status i{width:6px;height:6px;border-radius:50%;background:var(--moss);display:inline-block}
.prefs{margin-left:auto;display:flex;gap:6px}
.prefs select{border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:12px;font-weight:500;background:var(--paper);color:var(--ink);font-family:var(--sans);cursor:pointer}

/* Scrolling ticker (quiet) */
.ticker{overflow:hidden;white-space:nowrap;border-bottom:1px solid var(--line);background:var(--cream);padding:6px 0}
.ticker-track{display:inline-block;animation:tick 40s linear infinite;font-size:10.5px;letter-spacing:.22em;font-weight:600;color:var(--soft)}
.ticker-track em{font-style:normal;color:var(--moss)}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Front page logo */
.hero{padding:28px 4px 18px}
.hero .wordmark{font-size:clamp(52px,13vw,96px)}
.hero .kicker{margin:18px 0 0 6px}
.hero .rule{height:1px;background:var(--line);width:min(320px,70%);margin:18px 0 0 6px}

/* Thread */
.thread{flex:1;overflow-y:auto;padding:20px 16px}
.thread-in{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.msg{display:flex;gap:8px;align-items:flex-end}
.msg.me{justify-content:flex-end}
.bub{max-width:80%;padding:12px 16px;border-radius:18px;background:var(--paper);border:1px solid var(--line);overflow-wrap:anywhere}
.bot .bub{border-bottom-left-radius:6px}
.me .bub{background:var(--moss);color:#fff;border:0;border-bottom-right-radius:6px}
.me .bub a{color:#fff}
.bub.wide{max-width:88%;width:100%}
.bub img.shot{max-width:220px;max-height:260px;border-radius:12px;display:block}

.dots{display:inline-flex;gap:4px;margin-right:8px;vertical-align:middle}
.dots i{width:7px;height:7px;border-radius:50%;background:var(--moss);animation:b 1.2s infinite}
.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}
@keyframes b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.typing-step{font-size:14px;color:var(--muted)}

/* Result pieces */
.vchip{display:inline-block;color:#fff;font-weight:700;font-size:18px;letter-spacing:-0.01em;padding:4px 14px;border-radius:999px}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;background:var(--sage);color:var(--moss);margin-right:6px}
.muted{color:var(--muted);font-size:13px}
.warn{background:#FFF6E5;border-left:3px solid #E0A030;padding:8px 12px;margin:8px 0;border-radius:6px}
.mini{background:var(--sand);padding:12px 14px;margin-top:12px;border-radius:12px}
.mini b{font-weight:600}
.blk{margin-top:16px}
.blk h4{margin:0 0 6px;font-size:15px;font-weight:600}
.more{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}
.more summary{cursor:pointer;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--moss);list-style:none}
.more summary::-webkit-details-marker{display:none}
.sub{margin-top:16px;border:1px solid var(--line);border-radius:12px;background:var(--paper)}
.sub>summary{cursor:pointer;list-style:none;padding:10px 14px;font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px}
.sub>summary::after{content:'›';margin-left:auto;color:var(--moss);font-size:18px;transition:transform .15s}
.sub[open]>summary::after{transform:rotate(90deg)}
.sub summary::-webkit-details-marker,.group summary::-webkit-details-marker{display:none}
.sub-in{padding:4px 14px 12px}
.sub-label{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:var(--muted);margin:6px 0 6px}
.count{font-size:12px;font-weight:600;color:var(--muted);background:var(--sand);border-radius:999px;padding:1px 8px}
.group{border-top:1px solid var(--line);padding:8px 0}
.group>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:6px}
.group>summary::after{content:'›';margin-left:auto;color:var(--soft);transition:transform .15s}
.group[open]>summary::after{transform:rotate(90deg)}
.more .sub>summary,.more .group>summary{text-transform:none;letter-spacing:normal;color:var(--ink)}
.more .sub>summary{font-size:15px;font-weight:600}
.more .group>summary{font-size:13px;font-weight:500}
.ff ul,.ff ol{padding-left:20px;margin:0}
.ff li{margin:3px 0}
.bot a{color:var(--moss);text-underline-offset:2px}
.replybox{background:var(--lavender);padding:10px 14px;margin:8px 0;border-radius:12px}
.btn{border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink);font-family:var(--sans)}
.btn:hover{border-color:var(--moss);color:var(--moss)}
.err .bub{background:#FBECEC;border-color:#F0C9C9;color:#8A2B2B}

/* Composer */
.composer{background:var(--cream);border-top:1px solid var(--line);padding:12px 12px calc(12px + env(safe-area-inset-bottom))}
.comp-in{max-width:760px;margin:0 auto}
.preview{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.preview img{height:56px;border-radius:8px}
.preview button{border:0;background:var(--sand);border-radius:999px;width:24px;height:24px;cursor:pointer}
.bar{display:flex;gap:8px;align-items:flex-end}
.circle{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:20px;cursor:pointer}
.attach{border:1px solid var(--line);background:var(--paper)}
.send{border:0;color:#fff;background:var(--moss)}
.send:hover:not(:disabled){background:var(--moss-dk)}
.send:disabled{opacity:.3;cursor:not-allowed}
.input{flex:1;border:1px solid var(--line);border-radius:22px;padding:11px 16px;font-size:16px;resize:none;max-height:140px;font-family:inherit;background:var(--paper);color:var(--ink)}
.input::placeholder{color:var(--soft)}
.input:focus{outline:2px solid var(--moss);border-color:transparent}
.foot{text-align:center;font-size:10.5px;color:var(--soft);margin-top:8px}


/* Install ("Get it") button + sheet */
.getapp{border:0;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:600;background:var(--moss);color:#fff;font-family:var(--sans);cursor:pointer;white-space:nowrap}
.getapp:hover{background:var(--moss-dk)}
.sheet-bg{position:fixed;inset:0;background:rgba(29,29,31,.45);display:flex;align-items:flex-end;justify-content:center;z-index:50}
.sheet{background:var(--cream);width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:24px 20px calc(22px + env(safe-area-inset-bottom));max-height:90dvh;overflow-y:auto}
.sheet h2{margin:0 0 6px;font-weight:800;font-size:26px;letter-spacing:-0.03em}
.sheet ol{padding-left:22px}
.sheet li{margin:8px 0}
.stabs{display:flex;background:var(--sand);border-radius:999px;padding:4px}
.stab{flex:1;border:0;padding:8px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:var(--muted);font-family:var(--sans)}
.stab.on{background:var(--paper);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.bigbtn{display:block;text-align:center;text-decoration:none;border:0;width:100%;padding:14px;border-radius:999px;font-size:15px;font-weight:600;color:#fff;background:var(--moss);cursor:pointer;margin:14px 0;font-family:var(--sans)}
.bigbtn:hover{background:var(--moss-dk)}
.bigbtn.ghost{background:var(--paper);color:var(--ink);border:1px solid var(--line)}
.step-box{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-top:12px}
.step-box b:first-child{font-weight:700}
.name,.status{white-space:nowrap}

@media (max-width:540px){.status{display:none}.top .wordmark{font-size:34px}.top-in{gap:8px}.prefs{margin-left:0;width:100%;justify-content:flex-start}.prefs{gap:6px}}
@media (max-width:520px){.bub.wide{max-width:100%}}
@media (max-width:380px){.top .wordmark{font-size:30px}}

/* Header buttons: all the same height, font, and shape */
.prefs .getapp,.prefs .howlink,.prefs select{height:36px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;font-size:13px;font-weight:600;line-height:1.2;border-radius:999px;font-family:var(--sans);margin:0;white-space:nowrap;-webkit-appearance:none;appearance:none;vertical-align:middle;gap:5px;min-width:0}
.prefs .emo{font-size:14px;line-height:1}
.prefs .getapp{border:1px solid var(--moss)}
.prefs .howlink,.prefs select{border:1px solid var(--line);background-color:var(--paper);color:var(--ink)}
.prefs select{display:block;text-align:left;padding:0 30px 0 14px;text-overflow:ellipsis;overflow:hidden;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231D1D1F' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:10px 6px}
.prefs select.age{width:88px}
.prefs select.lang{width:132px}

/* Phones: the four buttons share one row that always fits the screen width */
@media (max-width:540px){
  .prefs{display:grid !important;grid-template-columns:max-content max-content max-content minmax(0,1fr);gap:6px;width:100%}
  .prefs .getapp,.prefs .howlink,.prefs select{height:36px;font-size:12.5px;padding:0 12px}
  .prefs select{padding:0 26px 0 12px;background-position:right 10px center}
  .prefs select.age{width:70px}
  .prefs select.lang{width:100%}
  .prefs .emo{display:none}
}
@media (max-width:430px){
  .prefs{gap:5px}
  .prefs .getapp,.prefs .howlink,.prefs select{font-size:12px;padding:0 10px}
  .prefs select{padding:0 22px 0 10px;background-position:right 8px center}
  .prefs select.age{width:62px}
}
@media (max-width:370px){
  .prefs .getapp,.prefs .howlink,.prefs select{font-size:11.5px;padding:0 8px}
  .prefs select{padding:0 20px 0 8px;background-position:right 7px center}
  .prefs select.age{width:56px}
}
@media (max-width:330px){
  .prefs{gap:5px}
  .prefs .getapp,.prefs .howlink,.prefs select{font-size:12px;padding:0 10px}
  .prefs select{padding:0 22px 0 10px;background-position:right 8px center}
  .prefs select.age{width:62px}
}
`;

function Badge({ category }) {
  return (
    <span
      style={{
        background: COLORS[category] || '#E2E0E6',
        color: DARK.includes(category) ? '#1D1D1F' : '#FFFFFF',
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

      {r.who_posted && (
        <div className="mini">
          <b>✍️ Who posted this?</b>
          <div style={{ marginTop: 6 }}>
            <span className="pill">{r.who_posted.type}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 14 }}>
            {r.who_posted.name ? <b>{r.who_posted.name}</b> : <span className="muted">We couldn't tell who made this.</span>}
          </div>
          <div style={{ marginTop: 4, fontSize: 14 }}>{r.who_posted.trust_note}</div>
        </div>
      )}

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

        {total > 0 && (
          <details className="sub">
            <summary>
              📚 Sources <span className="count">{total}</span>
            </summary>

            {data.keySources?.length > 0 && (
              <div className="sub-in">
                <div className="sub-label">Most important</div>
                <ul style={{ fontSize: 14 }}>
                  {data.keySources.map((s) => (
                    <SourceItem key={s.id} s={s} />
                  ))}
                </ul>
              </div>
            )}

            <div className="sub-in">
              <div className="sub-label">Everything I read, by type</div>
              {ORDER.filter((c) => data.sources.some((s) => s.category === c)).map((c) => {
                const group = data.sources.filter((s) => s.category === c);
                return (
                  <details key={c} className="group">
                    <summary>
                      <Badge category={c} /> <span className="count">{group.length}</span>
                    </summary>
                    <ul style={{ fontSize: 14, marginTop: 6 }}>
                      {group.map((s) => (
                        <SourceItem key={s.id} s={s} />
                      ))}
                    </ul>
                  </details>
                );
              })}
              <div className="muted" style={{ marginTop: 8 }}>
                Bias labels are approximate, based on published media bias ratings.
              </div>
            </div>
          </details>
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
  const [audience, setAudience] = useState('everyone');
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
          <div>
            <div className="wordmark">
              fact or feed<span>?</span>
            </div>
            <div className="status">
              <i />
              {loading ? 'Vera is checking…' : 'your fact-checking friend'}
            </div>
          </div>
          <div className="prefs">
            <button className="getapp" onClick={() => setShowInstall(true)} aria-label="Get it on your phone">
              <span className="emo">📲</span>
              <span>Get it</span>
            </button>
            <a className="howlink" href="/how-it-works">How we check</a>
            <select className="age" value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="Your age group" title="Your age group">
              <option value="everyone">Age</option>
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
            <span key={i}>IS THIS <em>FOR REAL?</em> &nbsp;&nbsp;●&nbsp;&nbsp; </span>
          ))}
        </div>
      </div>

      <div className="thread">
        <div className="thread-in">
          <div className="msg bot">
            <div className="av sm" aria-label="Vera">V</div>
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
                  <div className="av sm" aria-label="Vera">V</div>
                  <ResultBubble data={m.data} />
                </div>
              );
            }
            if (m.kind === 'reply') {
              return (
                <div key={m.id} className="msg bot">
                  <div className="av sm" aria-label="Vera">V</div>
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
                <div className="av sm" aria-label="Vera">V</div>
                <div className="bub">{m.text}</div>
              </div>
            );
          })}

          {loading && (
            <div className="msg bot">
              <div className="av sm" aria-label="Vera">V</div>
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
            Fact or Feed? uses AI and can make mistakes. Always check the sources.
          </div>
        </div>
      </footer>

      {showInstall && (
        <InstallSheet platform={platform} installEvent={installEvent} onClose={() => setShowInstall(false)} />
      )}
    </div>
  );
}

