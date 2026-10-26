'use client';
// The front page: what Fact or Feed? is, and the three tools to pick from.
import { useState, useEffect } from 'react';
import { CSS, LANGUAGES, TOOLS, TOOL_ORDER, toolName, InstallSheet } from './components/VeraChat';

const TEXT = {
  en: {
    intro: "Saw something online and not sure it's real? Vera and her team of AI agents check it for you, show you the sources they used, and never tell you what to think.",
    pick: 'Pick a tool',
    open: 'Open',
    facts: 'Ask a question. Vera goes straight to the original source when that’s best, or checks 30+ sources across the spectrum, and shows you the sources it used.',
    credible: 'Paste a link, post, or screenshot. See who published it and how they lean, the persuasion tactics it uses, and whether the facts hold up.',
    photo: 'Add a photo. Vera checks for AI warning signs, how believable the scene is, and compares it with real photos online.',
    note: 'Leaning left or right doesn’t make something false. We judge the facts separately.',
  },
  es: {
    intro: '¿Viste algo en internet y no sabes si es real? Vera y su equipo de agentes de IA lo revisan por ti, te muestran las fuentes que usaron y nunca te dicen qué pensar.',
    pick: 'Elige una herramienta',
    open: 'Abrir',
    facts: 'Haz una pregunta. Vera va directo a la fuente original cuando es lo mejor, o revisa más de 30 fuentes de todo el espectro, y te muestra las fuentes que usó.',
    credible: 'Pega un enlace, una publicación o una captura. Mira quién lo publicó y hacia dónde se inclina, las tácticas de persuasión que usa y si los hechos son correctos.',
    photo: 'Añade una foto. Vera busca señales de IA, revisa qué tan creíble es la escena y la compara con fotos reales en internet.',
    note: 'Inclinarse a la izquierda o a la derecha no hace que algo sea falso. Los hechos se revisan por separado.',
  },
  ht: {
    intro: 'Ou wè yon bagay sou entènèt epi ou pa sèten si se vre? Vera ak ekip ajan IA li a tcheke l pou ou, montre w sous yo itilize yo, epi yo pa janm di w sa pou w panse.',
    pick: 'Chwazi yon zouti',
    open: 'Louvri',
    facts: 'Poze yon kesyon. Vera ale dirèkteman nan sous orijinal la lè sa pi bon, oswa tcheke plis pase 30 sous, epi montre w sous li itilize yo.',
    credible: 'Kole yon lyen, yon post, oswa yon foto ekran. Wè kiyès ki pibliye l ak ki bò li panche, taktik pou konvenk moun li itilize, ak si fè yo kòrèk.',
    photo: 'Ajoute yon foto. Vera chèche siy IA, gade si sèn nan kredib, epi konpare l ak vrè foto sou entènèt.',
    note: 'Panche agoch oswa adwat pa fè yon bagay fo. Nou jije fè yo apa.',
  },
  zh: {
    intro: '在网上看到一些内容却不确定真假？Vera 和她的 AI 智能体团队会帮你核查，告诉你用了哪些来源，而且从不告诉你该怎么想。',
    pick: '选择一个工具',
    open: '打开',
    facts: '提出一个问题。在最合适的时候，Vera 会直接去找原始来源，或者查阅不同立场的 30 多个来源，并告诉你用了哪些来源。',
    credible: '粘贴链接、帖子或截图。看看是谁发布的、立场偏向哪边、用了哪些说服手法，以及事实是否站得住。',
    photo: '添加一张照片。Vera 会检查 AI 警示迹象、场景是否可信，并与网上的真实照片进行对比。',
    note: '偏左或偏右并不代表内容是假的。我们会单独判断事实。',
  },
  hi: {
    intro: 'ऑनलाइन कुछ देखा और यकीन नहीं कि सच है? वेरा और उसकी AI एजेंट टीम आपके लिए जाँच करती है, दिखाती है कि किन स्रोतों का इस्तेमाल हुआ, और कभी नहीं बताती कि आपको क्या सोचना है।',
    pick: 'एक टूल चुनें',
    open: 'खोलें',
    facts: 'कोई सवाल पूछें। जब सबसे अच्छा हो, वेरा सीधे मूल स्रोत पर जाती है, या हर विचारधारा के 30 से ज़्यादा स्रोत देखती है, और आपको वे स्रोत दिखाती है जिनका उसने इस्तेमाल किया।',
    credible: 'कोई लिंक, पोस्ट या स्क्रीनशॉट पेस्ट करें। देखें किसने छापा और उसका झुकाव किस ओर है, उसमें कौन-सी मनाने की तरकीबें हैं, और क्या तथ्य सही हैं।',
    photo: 'एक फ़ोटो जोड़ें। वेरा AI के चेतावनी संकेत देखती है, दृश्य कितना विश्वसनीय है, और उसकी तुलना ऑनलाइन असली फ़ोटो से करती है।',
    note: 'बाएँ या दाएँ झुकाव से कोई चीज़ झूठी नहीं हो जाती। हम तथ्यों को अलग से जाँचते हैं।',
  },
  ar: {
    intro: 'رأيت شيئًا على الإنترنت ولست متأكدًا من صحته؟ فيرا وفريقها من وكلاء الذكاء الاصطناعي يتحققون منه لك، ويُظهرون لك المصادر التي استخدموها، ولا يخبرونك أبدًا بما يجب أن تفكر فيه.',
    pick: 'اختر أداة',
    open: 'افتح',
    facts: 'اطرح سؤالًا. تذهب فيرا مباشرة إلى المصدر الأصلي عندما يكون ذلك الأفضل، أو تتحقق من أكثر من 30 مصدرًا من مختلف التوجهات، وتُظهر لك المصادر التي استخدمتها.',
    credible: 'الصق رابطًا أو منشورًا أو لقطة شاشة. اعرف من نشره وإلى أي اتجاه يميل، وأساليب الإقناع التي يستخدمها، وهل الحقائق صحيحة.',
    photo: 'أضف صورة. تبحث فيرا عن علامات الذكاء الاصطناعي، ومدى واقعية المشهد، وتقارنها بصور حقيقية على الإنترنت.',
    note: 'الميل إلى اليسار أو اليمين لا يجعل الخبر كاذبًا. نحكم على الحقائق بشكل منفصل.',
  },
  fr: {
    intro: 'Tu as vu quelque chose en ligne et tu n’es pas sûr que ce soit vrai ? Vera et son équipe d’agents IA vérifient pour toi, te montrent les sources utilisées, et ne te disent jamais quoi penser.',
    pick: 'Choisis un outil',
    open: 'Ouvrir',
    facts: 'Pose une question. Vera va directement à la source d’origine quand c’est le mieux, ou vérifie plus de 30 sources de tout le spectre, et te montre les sources utilisées.',
    credible: 'Colle un lien, une publication ou une capture. Vois qui l’a publié et de quel côté il penche, les techniques de persuasion utilisées, et si les faits tiennent.',
    photo: 'Ajoute une photo. Vera cherche les signes d’IA, vérifie si la scène est crédible et la compare avec de vraies photos en ligne.',
    note: 'Pencher à gauche ou à droite ne rend pas une info fausse. Nous jugeons les faits séparément.',
  },
  bn: {
    intro: 'অনলাইনে কিছু দেখেছ আর নিশ্চিত নও সেটা সত্যি কি না? ভেরা আর তার AI এজেন্টদের দল তোমার হয়ে যাচাই করে, দেখায় কোন কোন সূত্র ব্যবহার করা হয়েছে, আর কখনো বলে না তোমার কী ভাবা উচিত।',
    pick: 'একটা টুল বেছে নাও',
    open: 'খোলো',
    facts: 'একটা প্রশ্ন করো। দরকার হলে ভেরা সরাসরি মূল সূত্রে যায়, নয়তো সব মতের ৩০টিরও বেশি সূত্র দেখে, আর দেখায় কোন কোন সূত্র ব্যবহার করেছে।',
    credible: 'একটা লিংক, পোস্ট বা স্ক্রিনশট পেস্ট করো। দেখো কে প্রকাশ করেছে ও তাদের ঝোঁক কোন দিকে, কী প্রভাবিত করার কৌশল আছে, আর তথ্যগুলো ঠিক কি না।',
    photo: 'একটা ছবি দাও। ভেরা AI-এর সতর্কতার চিহ্ন খোঁজে, দৃশ্যটা কতটা বিশ্বাসযোগ্য দেখে, আর অনলাইনের আসল ছবির সাথে তুলনা করে।',
    note: 'বাম বা ডান দিকে ঝোঁক থাকলেই কিছু মিথ্যা হয়ে যায় না। আমরা তথ্য আলাদাভাবে যাচাই করি।',
  },
};

const HOME_CSS = `
.home{min-height:100dvh;height:auto;display:block}
.home-hero{background:#EFEAFA;border-bottom:1px solid #DCD4F0;padding:18px 16px 30px}
.home-hero-in{max-width:760px;margin:0 auto}
.home-top{display:flex;justify-content:flex-end}
.home .wordmark.big{font-size:clamp(56px,15vw,104px);display:block;text-align:center;margin-top:18px}
.home .status{justify-content:center;margin-top:12px}
.home .intro{font-size:17px;text-align:center;max-width:560px;margin:18px auto 0;color:var(--ink)}
.home-main{max-width:760px;margin:0 auto;padding:22px 16px 40px}
.home .pick{font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:var(--muted);margin:0 0 12px}
.cards{display:grid;gap:12px}
@media (min-width:700px){.cards{grid-template-columns:repeat(3,1fr)}}
.card{display:flex;flex-direction:column;gap:8px;background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px;text-decoration:none;color:var(--ink);transition:border-color .15s,transform .15s}
.card:hover{border-color:var(--moss);transform:translateY(-2px)}
.card .ico{width:44px;height:44px;border-radius:12px;background:var(--sage);display:grid;place-items:center;font-size:22px}
.card h2{margin:4px 0 0;font-size:19px;font-weight:700;letter-spacing:-0.01em}
.card p{margin:0;font-size:14px;color:var(--muted);flex:1}
.card .go{margin-top:6px;align-self:flex-start;background:var(--moss);color:#fff;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:600}
.home .lean-note{margin-top:18px;font-size:14px;background:var(--sand);border-radius:12px;padding:12px 14px;text-align:center}
.home-links{display:flex;gap:8px;justify-content:center;margin-top:20px;flex-wrap:wrap}
.home-links a,.home-links button{height:38px;display:inline-flex;align-items:center;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-decoration:none;font-size:13px;font-weight:600;font-family:var(--sans);cursor:pointer}
.home-links .primary{background:var(--moss);border-color:var(--moss);color:#fff}
.home .prefs{margin-left:0;width:auto;display:flex !important}
.home .prefs select.lang{width:132px}
`;

export default function Home() {
  const [language, setLanguage] = useState('auto');
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Old share links (from the iPhone shortcut) still work: send them to the credibility check
    const { search, hash } = window.location;
    const params = new URLSearchParams(search);
    if (hash.startsWith('#r=') || params.get('q') || params.get('img') || params.get('url') || params.get('text') || params.get('title')) {
      window.location.replace(`/credible${search}${hash}`);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem('ff-prefs') || '{}');
      if (saved.language) setLanguage(saved.language);
    } catch {}
  }, []);

  function changeLanguage(value) {
    setLanguage(value);
    try {
      const saved = JSON.parse(localStorage.getItem('ff-prefs') || '{}');
      localStorage.setItem('ff-prefs', JSON.stringify({ ...saved, language: value }));
    } catch {}
  }

  const t = TEXT[language] || TEXT.en;

  return (
    <div className="ff home">
      <style>{CSS + HOME_CSS}</style>

      <header className="home-hero">
        <div className="home-hero-in">
          <div className="home-top">
            <div className="prefs">
              <select className="lang" value={language} onChange={(e) => changeLanguage(e.target.value)} aria-label="Change language">
                {LANGUAGES.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <h1 className="wordmark big" style={{ margin: '18px 0 0' }}>
            fact or feed<span>?</span>
          </h1>
          <div className="status">
            <i /> your fact-checking friend
          </div>
          <p className="intro" dir="auto">{t.intro}</p>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i}>IS THIS <em>FOR REAL?</em> &nbsp;&nbsp;●&nbsp;&nbsp; </span>
          ))}
        </div>
      </div>

      <main className="home-main">
        <h2 className="pick">{t.pick}</h2>
        <div className="cards">
          {TOOL_ORDER.map((tool) => (
            <a key={tool} className="card" href={TOOLS[tool].href} dir="auto">
              <span className="ico" aria-hidden="true">{TOOLS[tool].icon}</span>
              <h2>{toolName(tool, language)}</h2>
              <p>{t[tool]}</p>
              <span className="go">{t.open} →</span>
            </a>
          ))}
        </div>

        <div className="lean-note" dir="auto">⚖️ {t.note}</div>

        <div className="home-links">
          <a href="/how-it-works">How we check</a>
          <button className="primary" onClick={() => setShowInstall(true)}>📲 Get it on your iPhone</button>
        </div>
        <p className="foot" style={{ marginTop: 18 }}>
          Fact or Feed? uses AI and can make mistakes. Always check the sources.
        </p>
      </main>

      {showInstall && <InstallSheet onClose={() => setShowInstall(false)} />}
    </div>
  );
}
