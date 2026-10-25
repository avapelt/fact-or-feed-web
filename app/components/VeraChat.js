'use client';
import { useState, useEffect, useRef } from 'react';

const STEPS = {
  credible: [
    'The Manager is making a game plan…',
    'Reading what you sent…',
    'Checking who published it and how they lean…',
    'Spotting persuasion tactics…',
    'Searching 30+ sources across the spectrum…',
    'Checking official sources and published research…',
    'Weighing the evidence…',
    'Having a second AI double-check it…',
  ],
  facts: [
    'The Manager is deciding: go to the original source, or search widely?',
    'Understanding your question…',
    'Finding the original source and searching across the spectrum…',
    'Labeling every source…',
    'Weighing the evidence…',
    'Writing your answer…',
    'Having a second AI double-check it…',
  ],
  photo: [
    'Three photo agents are looking for AI warning signs…',
    'Figuring out what the photo shows…',
    'Searching for real photos of the same thing…',
    'Comparing your photo with the real ones…',
    'Writing up what I found…',
  ],
};

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
// The three tools: icon, link, and name in each language
export const TOOLS = {
  facts: {
    icon: '🔎',
    href: '/facts',
    short: { en: 'Find facts', es: 'Hechos', ht: 'Verite', zh: '查事实', hi: 'तथ्य', ar: 'الحقائق', fr: 'Les faits', bn: 'তথ্য' },
    name: { en: 'Find the facts', es: 'Encuentra los hechos', ht: 'Jwenn verite a', zh: '查找事实', hi: 'तथ्य खोजें', ar: 'ابحث عن الحقائق', fr: 'Trouver les faits', bn: 'তথ্য খুঁজুন' },
  },
  credible: {
    icon: '📰',
    href: '/credible',
    short: { en: 'Credible?', es: '¿Creíble?', ht: 'Serye?', zh: '可信吗？', hi: 'भरोसेमंद?', ar: 'موثوق؟', fr: 'Crédible ?', bn: 'বিশ্বাসযোগ্য?' },
    name: { en: 'Is this news credible?', es: '¿Es creíble esta noticia?', ht: 'Èske nouvèl sa a serye?', zh: '这条新闻可信吗？', hi: 'क्या यह खबर भरोसेमंद है?', ar: 'هل هذا الخبر موثوق؟', fr: 'Cette info est-elle crédible ?', bn: 'এই খবর কি বিশ্বাসযোগ্য?' },
  },
  photo: {
    icon: '🤖',
    href: '/photo',
    short: { en: 'AI photo?', es: '¿Foto IA?', ht: 'Foto IA?', zh: 'AI照片？', hi: 'AI फ़ोटो?', ar: 'صورة AI؟', fr: 'Photo IA ?', bn: 'AI ছবি?' },
    name: { en: 'Is this photo AI?', es: '¿Esta foto es IA?', ht: 'Èske foto sa a se IA?', zh: '这张照片是AI做的吗？', hi: 'क्या यह फ़ोटो AI है?', ar: 'هل هذه الصورة ذكاء اصطناعي؟', fr: 'Cette photo est-elle IA ?', bn: 'এই ছবি কি AI?' },
  },
};
export const TOOL_ORDER = ['facts', 'credible', 'photo'];
export function toolName(tool, language) {
  return TOOLS[tool].name[language] || TOOLS[tool].name.en;
}

const PLACEHOLDERS = {
  facts: 'Ask a question or name a topic…',
  credible: 'Paste a news link or a post…',
  photo: 'Tap 📎 to add a photo…',
};

const AI_LEVELS = ['Low chance of AI', 'Medium chance of AI', 'High chance of AI'];
const AI_COLORS = ['#2F8F5B', '#D99A2B', '#C2413B'];

// iCloud link of the Fact or Feed? Shortcut (Shortcuts app → hold the shortcut → Share → Copy iCloud Link)
const SHORTCUT_URL = 'https://www.icloud.com/shortcuts/b8d2bacab3a542ffb17e0c96143b1500';


const WELCOME = {
  facts: {
    en: "Hey! 👋 I'm Vera. Ask me anything you want the facts on, like \"When is the next Miami election?\" I'll go straight to the original source when that's best, or check 30+ sources, and show you where every piece came from.",
    es: '¡Hola! 👋 Soy Vera. Pregúntame lo que quieras saber, como "¿Cuándo es la próxima elección en Miami?". Iré directo a la fuente original cuando sea lo mejor, o revisaré más de 30 fuentes, y te mostraré de dónde salió cada dato.',
    ht: 'Bonjou! 👋 Mwen se Vera. Mande m nenpòt bagay ou vle konnen verite a, tankou "Kilè pwochen eleksyon Miami a ye?". M ap ale dirèkteman nan sous orijinal la lè sa pi bon, oswa tcheke plis pase 30 sous, epi m ap montre w kote chak enfòmasyon soti.',
    zh: '你好！👋 我是 Vera。问我任何你想了解事实的问题，比如"迈阿密下一次选举是什么时候？"。在最合适的时候我会直接去找原始来源，或者查阅 30 多个来源，并告诉你每条信息出自哪里。',
    hi: 'नमस्ते! 👋 मैं वेरा हूँ। मुझसे कुछ भी पूछें जिसके तथ्य आप जानना चाहते हैं, जैसे "मियामी का अगला चुनाव कब है?" जब सबसे अच्छा हो, मैं सीधे मूल स्रोत पर जाऊँगी, या 30 से ज़्यादा स्रोत देखूँगी, और बताऊँगी कि हर जानकारी कहाँ से आई।',
    ar: 'مرحبًا! 👋 أنا فيرا. اسألني عن أي شيء تريد معرفة حقيقته، مثل "متى الانتخابات القادمة في ميامي؟". سأذهب مباشرة إلى المصدر الأصلي عندما يكون ذلك الأفضل، أو أتحقق من أكثر من 30 مصدرًا، وأريك من أين جاءت كل معلومة.',
    fr: 'Salut ! 👋 Je suis Vera. Pose-moi n\'importe quelle question, comme « Quand a lieu la prochaine élection à Miami ? ». J\'irai directement à la source d\'origine quand c\'est le mieux, ou je vérifierai plus de 30 sources, et je te montrerai d\'où vient chaque info.',
    bn: 'হ্যালো! 👋 আমি ভেরা। যেকোনো বিষয়ের তথ্য জানতে আমাকে জিজ্ঞেস করো, যেমন "মিয়ামির পরের নির্বাচন কবে?"। দরকার হলে আমি সরাসরি মূল সূত্রে যাব, নয়তো ৩০টিরও বেশি সূত্র দেখব, আর দেখাব প্রতিটি তথ্য কোথা থেকে এসেছে।',
  },
  credible: {
    en: "Hey! 👋 I'm Vera. Paste a news link or a post, or add a screenshot with 📎, and I'll show you how credible it is: who published it and how they lean, the persuasion tactics it uses, and whether the facts hold up. Remember: leaning left or right doesn't make something false.",
    es: '¡Hola! 👋 Soy Vera. Pega un enlace de noticias o una publicación, o añade una captura con 📎, y te muestro qué tan creíble es: quién lo publicó y hacia dónde se inclina, las tácticas de persuasión que usa y si los hechos son correctos. Recuerda: inclinarse a la izquierda o a la derecha no lo hace falso.',
    ht: 'Bonjou! 👋 Mwen se Vera. Kole yon lyen nouvèl oswa yon post, oswa ajoute yon foto ekran ak 📎, epi m ap montre w kijan li serye: kiyès ki pibliye l ak ki bò li panche, taktik pou konvenk moun li itilize, ak si fè yo kòrèk. Sonje: panche agoch oswa adwat pa fè yon bagay fo.',
    zh: '你好！👋 我是 Vera。粘贴新闻链接或帖子，或用 📎 添加截图，我会告诉你它有多可信：谁发布的、立场偏向哪边、用了哪些说服手法，以及事实是否站得住。记住：偏左或偏右并不代表内容是假的。',
    hi: 'नमस्ते! 👋 मैं वेरा हूँ। कोई न्यूज़ लिंक या पोस्ट पेस्ट करें, या 📎 से स्क्रीनशॉट जोड़ें, और मैं बताऊँगी कि यह कितना भरोसेमंद है: किसने छापा और उसका झुकाव किस ओर है, इसमें कौन-सी मनाने की तरकीबें हैं, और क्या तथ्य सही हैं। याद रखें: बाएँ या दाएँ झुकाव से कोई चीज़ झूठी नहीं हो जाती।',
    ar: 'مرحبًا! 👋 أنا فيرا. الصق رابط خبر أو منشورًا، أو أضف لقطة شاشة عبر 📎، وسأريك مدى مصداقيته: من نشره وإلى أي اتجاه يميل، وأساليب الإقناع التي يستخدمها، وهل الحقائق صحيحة. تذكّر: الميل إلى اليسار أو اليمين لا يجعل الخبر كاذبًا.',
    fr: 'Salut ! 👋 Je suis Vera. Colle un lien d\'actualité ou une publication, ou ajoute une capture avec 📎, et je te montre à quel point c\'est crédible : qui l\'a publié et de quel côté il penche, les techniques de persuasion utilisées, et si les faits tiennent. Rappel : pencher à gauche ou à droite ne rend pas une info fausse.',
    bn: 'হ্যালো! 👋 আমি ভেরা। একটা খবরের লিংক বা পোস্ট পেস্ট করো, বা 📎 দিয়ে স্ক্রিনশট দাও, আমি দেখাব এটা কতটা বিশ্বাসযোগ্য: কে প্রকাশ করেছে ও তাদের ঝোঁক কোন দিকে, কী কী প্রভাবিত করার কৌশল আছে, আর তথ্যগুলো ঠিক কি না। মনে রেখো: বাম বা ডান দিকে ঝোঁক থাকলেই কিছু মিথ্যা হয়ে যায় না।',
  },
  photo: {
    en: "Hey! 👋 I'm Vera. Tap 📎 to add a photo and I'll check the chance it's AI-made: warning signs, how believable the scene is, and how it compares with real photos online.",
    es: '¡Hola! 👋 Soy Vera. Toca 📎 para añadir una foto y reviso la probabilidad de que esté hecha con IA: señales de alerta, qué tan creíble es la escena y cómo se compara con fotos reales en internet.',
    ht: 'Bonjou! 👋 Mwen se Vera. Peze 📎 pou ajoute yon foto epi m ap tcheke chans pou li fèt ak IA: siy avètisman, si sèn nan kredib, ak kijan li konpare ak vrè foto sou entènèt.',
    zh: '你好！👋 我是 Vera。点 📎 添加一张照片，我会检查它是 AI 生成的可能性：警示迹象、场景是否可信，以及与网上真实照片的对比。',
    hi: 'नमस्ते! 👋 मैं वेरा हूँ। 📎 दबाकर फ़ोटो जोड़ें और मैं जाँचूँगी कि इसके AI से बने होने की कितनी संभावना है: चेतावनी के संकेत, दृश्य कितना विश्वसनीय है, और यह ऑनलाइन असली फ़ोटो से कैसे मिलती है।',
    ar: 'مرحبًا! 👋 أنا فيرا. اضغط 📎 لإضافة صورة وسأتحقق من احتمال أن تكون مصنوعة بالذكاء الاصطناعي: علامات التحذير، ومدى واقعية المشهد، ومقارنتها بصور حقيقية على الإنترنت.',
    fr: 'Salut ! 👋 Je suis Vera. Appuie sur 📎 pour ajouter une photo et je vérifie la probabilité qu\'elle soit faite par IA : signes d\'alerte, crédibilité de la scène et comparaison avec de vraies photos en ligne.',
    bn: 'হ্যালো! 👋 আমি ভেরা। 📎 চেপে একটা ছবি দাও, আমি দেখব এটা AI দিয়ে বানানোর সম্ভাবনা কতটা: সতর্কতার চিহ্ন, দৃশ্যটা কতটা বিশ্বাসযোগ্য, আর অনলাইনের আসল ছবির সাথে তুলনা।',
  },
};

// Shown in the language menu
// "Language" tells people they can tap here to change it
export const LANGUAGES = [
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

export const CSS = `
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
.review{margin-top:10px;font-size:13.5px;border-left:3px solid var(--moss);padding:6px 0 6px 12px}
.compare{margin-top:12px;padding-top:10px;border-top:1px solid #E2DCF2}
.thumbs{display:flex;gap:6px;margin-top:8px;overflow-x:auto}
.thumbs img{width:64px;height:64px;object-fit:cover;border-radius:8px;display:block;border:1px solid var(--line)}
.toolnav{display:flex;gap:6px;padding:8px 16px;border-bottom:1px solid var(--line);background:var(--cream);overflow-x:auto;scrollbar-width:none}
.toolnav::-webkit-scrollbar{display:none}
.toolnav-in{max-width:760px;margin:0 auto;display:flex;gap:6px;width:100%}
.toolnav a{flex:1;min-width:max-content;text-align:center;height:34px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);text-decoration:none;font-size:12.5px;font-weight:600;padding:0 12px;white-space:nowrap}
.tn-short{display:none}
@media (max-width:640px){.tn-long{display:none}.tn-short{display:inline}.toolnav a{min-width:0;padding:0 8px}}
.toolnav a.on{background:var(--moss);border-color:var(--moss);color:#fff}
a.wordmark{text-decoration:none;display:inline-block}
.lean{display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:8px}
.lean div{flex:1}
.lean-labels{display:flex;font-size:10.5px;margin-top:3px}
.lean-labels span{flex:1;text-align:center}
.agree{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 8px;border-radius:999px;margin-left:6px;white-space:nowrap}
.origin{margin-top:12px;border:1px solid #CFE6D9;background:#EFF8F2;border-radius:12px;padding:10px 14px;font-size:14px}
.answer{font-size:18px;font-weight:600;line-height:1.4;margin:4px 0 8px}
.choose{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.btn:disabled{opacity:.5;cursor:default}
.newrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.newsearch{border:1px solid var(--moss);background:var(--paper);color:var(--moss);border-radius:999px;height:32px;padding:0 14px;font-size:13px;font-weight:600;font-family:var(--sans);cursor:pointer;white-space:nowrap;-webkit-appearance:none;appearance:none}
.newsearch:hover{background:var(--moss);color:#fff}
.notebook{margin-top:10px;font-size:13.5px;background:#FFF8E6;border-radius:10px;padding:8px 12px}
.feedback{margin-top:12px;padding-top:10px;border-top:1px solid var(--line);display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}
.feedback .btn{padding:5px 12px}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{border:1px solid var(--line);background:var(--paper);border-radius:999px;padding:5px 12px;font-size:12.5px;font-family:var(--sans);cursor:pointer;color:var(--ink)}
.chip.on{background:var(--moss);border-color:var(--moss);color:#fff}
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
.prefs select.age{width:96px}
.prefs select.lang{width:132px}

/* Phones: the four buttons share one row that always fits the screen width */
@media (max-width:540px){
  .prefs{display:grid !important;grid-template-columns:max-content max-content max-content minmax(0,1fr);gap:6px;width:100%}
  .prefs .getapp,.prefs .howlink,.prefs select{height:36px;font-size:12.5px;padding:0 12px}
  .prefs select{padding:0 26px 0 12px;background-position:right 10px center}
  .prefs select.age{width:92px}
  .prefs select.lang{width:100%}
  .prefs .emo{display:none}
}
@media (max-width:430px){
  .prefs{gap:5px}
  .prefs .getapp,.prefs .howlink,.prefs select{font-size:12px;padding:0 10px}
  .prefs select{padding:0 22px 0 10px;background-position:right 8px center}
  .prefs select.age{width:78px}
}
@media (max-width:370px){
  .prefs .getapp,.prefs .howlink,.prefs select{font-size:11.5px;padding:0 8px}
  .prefs select{padding:0 20px 0 8px;background-position:right 7px center}
  .prefs select.age{width:64px}
}
@media (max-width:330px){
  .prefs{gap:5px}
  .prefs .getapp,.prefs .howlink,.prefs select{font-size:12px;padding:0 10px}
  .prefs select{padding:0 22px 0 10px;background-position:right 8px center}
  .prefs select.age{width:74px}
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

// Optional rating. A 👎 asks which part was wrong, so the lesson goes to the agent who does that job.
function Feedback({ claims, verdict, realStory, areas = [] }) {
  const [state, setState] = useState('ask'); // ask | why | sending | done
  const [area, setArea] = useState('');
  const [note, setNote] = useState('');
  const [lesson, setLesson] = useState(null);

  async function sendFeedback(correct, chosenArea = '', why = '') {
    setState('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claims, verdict, realStory, correct, note: why, area: chosenArea }),
      });
      const out = await res.json();
      setLesson(out.lesson ? { text: out.lesson, job: out.job } : null);
    } catch {}
    setState('done');
  }

  if (state === 'done') {
    return (
      <div className="feedback muted" style={{ display: 'block' }}>
        📒 Thanks! I wrote that in my notebook so I'll do better next time.
        {lesson && (
          <div style={{ marginTop: 4 }}>
            Lesson learned{lesson.job ? ` for ${lesson.job.split(' (')[0]}` : ''}: "{lesson.text.replace(/[.!]+$/, '')}."
          </div>
        )}
      </div>
    );
  }
  if (state === 'sending') return <div className="feedback muted">Writing it in my notebook…</div>;
  if (state === 'why') {
    return (
      <div className="feedback" style={{ display: 'block' }}>
        {areas.length > 0 && (
          <>
            <div className="muted" style={{ marginBottom: 6 }}>Which part was wrong?</div>
            <div className="chips">
              {areas.map((a) => (
                <button key={a} className={`chip ${area === a ? 'on' : ''}`} onClick={() => setArea(a)}>
                  {a}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="muted" style={{ margin: '8px 0 6px' }}>Tell me more (optional, no names or personal info):</div>
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: this photo is actually AI-made" style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button className="btn" onClick={() => sendFeedback(false, area, note)}>Send</button>
          <button className="btn" onClick={() => setState('ask')}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="feedback">
      <span className="muted">Rate this (optional):</span>
      <button className="btn" onClick={() => sendFeedback(true)} aria-label="This was right">👍</button>
      <button className="btn" onClick={() => setState('why')} aria-label="This was wrong">👎</button>
    </div>
  );
}

function PhotoCheck({ check, title = '🤖 Could this image be AI-made?' }) {
  return (
    <div className="mini">
          {title && <b>{title}</b>}
          <Meter labels={AI_LEVELS} colors={AI_COLORS} active={AI_LEVELS.indexOf(check.level)} />
          {check.plausibility && (
            <div style={{ marginTop: 10, fontSize: 14 }}>
              🎯 <b>How believable is this scene?</b> {check.plausibility}
              {check.plausibility_reason ? `: ${check.plausibility_reason}` : ''}
            </div>
          )}
          {check.signs.length > 0 && (
            <ul style={{ marginTop: 8, fontSize: 14 }}>
              {check.signs.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {check.comparison && (
            <div className="compare">
              <div>
                <b>🔍 Compared with real photos online</b>
              </div>
              <div style={{ marginTop: 4 }}>
                <span className="pill">{check.comparison.match}</span>
                <span className="pill">{check.comparison.effect}</span>
              </div>
              {check.comparison.reused_old_photo && (
                <div className="warn" style={{ marginTop: 6 }}>⚠️ This photo may be an older or unrelated photo being reposted.</div>
              )}
              <div style={{ marginTop: 6, fontSize: 14 }}>{check.comparison.comparison}</div>
              {check.comparison.compared?.length > 0 && (
                <div className="thumbs">
                  {check.comparison.compared.map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noreferrer" title={c.description || 'Photo found online'}>
                      <img src={c.url} alt={c.description || 'Photo found online'} onError={(e) => (e.currentTarget.parentElement.style.display = 'none')} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="muted" style={{ marginTop: 6 }}>
            {check.checks > 1 && (
              <>
                {check.agree} of {check.checks} independent checks agreed.{' '}
              </>
            )}
            Warning signs aren't proof. No tool can say for sure if an image is AI-made.
          </div>
        </div>
  );
}

function PhotoResultBubble({ data, image, onFactCheck }) {
  const p = data.photo;
  const color = AI_COLORS[AI_LEVELS.indexOf(p.level)] || '#6f6858';
  return (
    <div className="bub wide">
      <span className="vchip" style={{ background: color }}>{p.level}</span>
      <p dir="auto" style={{ margin: '12px 0 6px', fontWeight: 600 }}>{p.headline}</p>
      <p dir="auto" style={{ margin: '0 0 4px' }}>{p.explanation}</p>
      {p.description && <p className="muted" dir="auto" style={{ margin: '6px 0 0' }}>📷 What I see: {p.description}</p>}
      <PhotoCheck check={p} title="🔎 The details" />
      <div className="notebook">💡 <b>Check it yourself:</b> {p.tip}</div>
      {image && onFactCheck && (
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={onFactCheck}>📰 Now check if the story is credible</button>
        </div>
      )}
      <Feedback
        claims={[`Photo check: ${p.description || 'a photo'}`]}
        verdict={p.level}
        realStory={p.explanation}
        areas={['The photo check', 'The photo comparison', 'Something else']}
      />
    </div>
  );
}

const LEANS = ['Left', 'Lean Left', 'Center', 'Lean Right', 'Right'];
const AGREE_COLORS = { 'Sources agree': ['#DDF0E4', '#1F6B43'], 'Sources disagree': ['#FBE3DF', '#9A3328'], 'Only one source': ['#FFF1D6', '#8A5A12'] };

// Where the outlet sits on the left-right spectrum, with a reminder that lean is not accuracy
function OutletLean({ outlet, note }) {
  const i = LEANS.indexOf(outlet?.category);
  return (
    <div className="mini">
      <b>📰 Who published it and how they lean</b>
      <div style={{ marginTop: 6, fontSize: 14 }}>
        <b>{outlet.domain}</b> <Badge category={outlet.category} />
      </div>
      {i >= 0 && (
        <>
          <div className="lean">
            {LEANS.map((l, k) => (
              <div key={l} style={{ background: COLORS[l], opacity: k === i ? 1 : 0.18 }} />
            ))}
          </div>
          <div className="lean-labels">
            {LEANS.map((l, k) => (
              <span key={l} style={{ fontWeight: k === i ? 700 : 400 }}>{l}</span>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: 8, fontSize: 14 }}>
        {note || 'Leaning left or right does not make an article true or false. We judge the facts separately.'}
      </div>
      <div className="muted" style={{ marginTop: 4 }}>Bias labels are approximate, based on published media bias ratings.</div>
    </div>
  );
}

function SourcesList({ data, total }) {
  return (
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
  );
}

function ReviewBox({ review }) {
  if (!review) return null;
  return (
    <div className="review">
      <div>
        <b>{review.approved ? '✅ Double-checked' : '🔧 Double-checked & corrected'}</b>
        <span className="pill" style={{ marginLeft: 8 }}>Confidence: {review.confidence}</span>
      </div>
      <div style={{ marginTop: 4 }}>{review.review_note}</div>
      {!review.approved && review.issues.length > 0 && (
        <ul style={{ marginTop: 6 }}>
          {review.issues.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanBlock({ data }) {
  const plan = data.trace?.plan;
  if (!plan) return null;
  return (
    <Block title="🧭 The Manager's game plan">
      <p style={{ margin: '0 0 6px', fontSize: 14 }}>{plan.analysis}</p>
      <div className="chips" style={{ marginBottom: 6 }}>
        {[
          [`Went to the original source${plan.original_source ? `: ${plan.original_source}` : ''}`, plan.go_to_original],
          [`News search: ${plan.news_search}`, plan.news_search !== 'none'],
          ['Official sources', plan.official_sources || plan.emergency_mode],
          ['Research papers', plan.research_papers],
          ['Persuasion check', plan.persuasion],
          ['🚨 Emergency mode', plan.emergency_mode],
        ]
          .filter(([, on]) => on)
          .map(([label]) => (
            <span key={label} className="chip on" style={{ cursor: 'default' }}>
              {label}
            </span>
          ))}
      </div>
      <ul style={{ fontSize: 13.5 }}>
        {plan.reasons.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </Block>
  );
}

function TraceBlock({ data }) {
  if (!data.trace?.timings) return null;
  const q = data.trace.queries || {};
  return (
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
          {[...(q.original || []), ...(q.news || []), ...(q.official || []), ...(q.research || [])].map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </details>
    </Block>
  );
}

// 🔎 Find the facts: the answer, the consensus, and where each piece came from
function FactsBubble({ data }) {
  const r = data.result;
  const total = data.sources?.length || 0;
  const byId = (id) => data.sources?.find((s) => s.id === id);
  const original = r.original_source;
  const originalSrc = original?.source_id != null ? byId(original.source_id) : null;
  return (
    <div className="bub wide">
      <div className="answer" dir="auto">{r.answer}</div>
      <p dir="auto" style={{ margin: '0 0 8px' }}>{r.details}</p>
      <p dir="auto" style={{ margin: 0, fontSize: 14 }}>
        <span className="pill">Consensus: {r.consensus.level}</span>
        {r.consensus.explanation}
      </p>

      {original && (
        <div className="origin">
          <b>🎯 Straight from the original source: {original.name}</b>
          <div style={{ marginTop: 4 }}>{original.what_it_says}</div>
          {originalSrc && (
            <div style={{ marginTop: 4 }}>
              <a href={originalSrc.url} target="_blank" rel="noreferrer">{originalSrc.title}</a>
            </div>
          )}
        </div>
      )}

      <ReviewBox review={data.review} />
      {r.notebook_note && <div className="notebook">📒 <b>From my notebook:</b> {r.notebook_note}</div>}

      {r.breakdown?.length > 0 && (
        <div className="mini">
          <b>🧩 Where each piece came from</b>
          <ul style={{ marginTop: 8, fontSize: 14, listStyle: 'none', padding: 0 }}>
            {r.breakdown.map((b, i) => {
              const [bg, fg] = AGREE_COLORS[b.agreement] || ['#eee', '#333'];
              const srcs = b.source_ids.map(byId).filter(Boolean);
              return (
                <li key={i} style={{ marginBottom: 10 }}>
                  {b.point}
                  <span className="agree" style={{ background: bg, color: fg }}>{b.agreement}</span>
                  {srcs.length > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {srcs.map((s) => (
                        <a key={s.id} href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                          <Badge category={s.original ? 'Official' : s.category} /> {s.domain}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {total > 0 && (
        <div className="mini">
          <b>⚖️ {data.trace?.plan?.go_to_original ? `I went to the original source and read ${total} sources` : `I checked ${total} sources`}</b>
          <SpectrumBar stats={data.stats || {}} total={total} />
        </div>
      )}

      <details className="more">
        <summary>See the full breakdown ↓</summary>
        {r.disputed.length > 0 && (
          <Block title="🤔 Sources disagree on">
            <ul style={{ fontSize: 14 }}>{r.disputed.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </Block>
        )}
        {r.unknown.length > 0 && (
          <Block title="❓ Still unknown">
            <ul style={{ fontSize: 14 }}>{r.unknown.map((u, i) => <li key={i}>{u}</li>)}</ul>
          </Block>
        )}
        <Block title="🧠 How I figured this out">
          <ol style={{ fontSize: 14 }}>{r.how_we_figured_it_out.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Block>
        <PlanBlock data={data} />
        <TraceBlock data={data} />
        {total > 0 && <SourcesList data={data} total={total} />}
      </details>

      <Feedback
        claims={data.trace?.claims || [r.answer]}
        verdict={`answer (consensus: ${r.consensus.level})`}
        realStory={r.answer}
        areas={['The answer', 'The original source', 'The sources', 'Something else']}
      />
    </div>
  );
}

function ResultBubble({ data, image, onPhotoCheck }) {
  const r = data.result;
  const total = data.sources?.length || 0;
  const vIndex = VERDICTS.indexOf(r.verdict);
  const vColor = vIndex >= 0 ? VERDICT_COLORS[vIndex] : '#6f6858';

  return (
    <div className="bub wide">
      <div className="sub-label" style={{ marginTop: 0 }}>Are the facts accurate?</div>
      <span className="vchip" style={{ background: vColor }}>{r.verdict}</span>
      {vIndex >= 0 && <Meter labels={VERDICTS} colors={VERDICT_COLORS} active={vIndex} />}

      {r.warning && <div className="warn">⚠️ {r.warning}</div>}

      <p dir="auto" style={{ margin: '12px 0 8px' }}>{r.real_story}</p>
      <p dir="auto" style={{ margin: 0, fontSize: 14 }}>
        <span className="pill">Consensus: {r.consensus.level}</span>
        {r.consensus.explanation}
      </p>

      <ReviewBox review={data.review} />

      {r.notebook_note && (
        <div className="notebook">📒 <b>From my notebook:</b> {r.notebook_note}</div>
      )}

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

      {data.outlet && <OutletLean outlet={data.outlet} note={r.bias_note} />}
      {!data.outlet && r.bias_note && <div className="mini">📰 {r.bias_note}</div>}

      {r.persuasion_tactics?.length > 0 ? (
        <div className="mini">
          <b>🎣 How it tries to persuade you</b>
          <ul style={{ marginTop: 6, fontSize: 14 }}>
            {r.persuasion_tactics.map((t, i) => (
              <li key={i}>
                <b>{t.tactic}</b> ({t.where}): {t.explanation}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        data.trace?.plan?.persuasion && <div className="mini">🎣 <b>Persuasion tactics:</b> I didn't spot any clear ones.</div>
      )}

      {data.imageCheck && <PhotoCheck check={data.imageCheck} />}

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

        <Block title="🧠 How I figured this out">
          <ol style={{ fontSize: 14 }}>
            {r.how_we_figured_it_out.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Block>

        <PlanBlock data={data} />
        <TraceBlock data={data} />
        {total > 0 && <SourcesList data={data} total={total} />}
      </details>

      <Feedback
        claims={data.trace?.claims || [r.real_story]}
        verdict={r.verdict}
        realStory={r.real_story}
        areas={['The verdict', ...(data.imageCheck ? ['The photo check'] : []), 'The sources', 'Persuasion tactics', 'Who posted it', 'Something else']}
      />
      {image && onPhotoCheck && !data.imageCheck && (
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={onPhotoCheck}>🤖 Also check if this photo is AI</button>
        </div>
      )}
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

export function InstallSheet({ onClose }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Put it on your iPhone</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          See a sketchy post anywhere? Just tap <b>Share → Fact or Feed?</b>
        </p>

        <a className="bigbtn" href={SHORTCUT_URL} target="_blank" rel="noreferrer">
          Add the Fact or Feed? shortcut
        </a>
        <div className="step-box">
          <b>How it works</b>
          <ol>
            <li>Tap the button above, then <b>Add Shortcut</b>.</li>
            <li>On any post, link, article, or screenshot, tap <b>Share</b>.</li>
            <li>Scroll down and tap <b>Fact or Feed?</b> It opens and starts checking right away.</li>
            <li>You can also open Fact or Feed? and tap <b>📎</b> to add a photo.</li>
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

        <button className="bigbtn ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const PHOTO_FOLLOWUP_HINT =
  'Got questions? Ask me about this photo check, like "Which warning sign matters most?" Or tap 📎 to check another photo.';

const FOLLOWUP_HINT =
  'Got questions? Ask me anything about this report, like "Why did you say that?" or "Which source is most reliable?" Or tap ＋ New search to check something else.';

let nextId = 1;

export default function VeraChat({ tool = 'credible' }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState(null);
  const [audience, setAudience] = useState('everyone');
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [checkingPhoto, setCheckingPhoto] = useState(false);
  const [report, setReport] = useState(null); // the last report, so Vera can answer follow-up questions
  const [askHistory, setAskHistory] = useState([]);
  const [loadingKind, setLoadingKind] = useState('check');
  const steps = STEPS[tool] || STEPS.credible;
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
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ff-prefs') || '{}');
      if (saved.audience) setAudience(saved.audience);
      if (saved.language) setLanguage(saved.language);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('ff-prefs', JSON.stringify({ audience, language }));
    } catch {}
  }, [audience, language]);

  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, step]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 8000);
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
        presentReport(data);
      } catch {
        add({ from: 'bot', kind: 'error', text: "I couldn't open that result. Try sharing it again." });
      }
      return;
    }

    // A photo or post handed over from another tool ("Also check if this photo is AI", etc.)
    let handoff = null;
    try {
      handoff = JSON.parse(sessionStorage.getItem('ff-handoff') || 'null');
      if (handoff?.tool === tool) sessionStorage.removeItem('ff-handoff');
      else handoff = null;
    } catch {}
    if (handoff) {
      if (tool === 'photo') sendPhoto(handoff.text || '', handoff.image);
      else send(handoff.text || '', handoff.image);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const q =
      params.get('q') ||
      [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join(' ');
    const sharedPhoto = params.get('img');
    if (!q && !sharedPhoto) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (tool === 'photo') sendPhoto(q, null, sharedPhoto);
    else send(q, null, sharedPhoto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shows a finished report, then either invites questions or asks a clarifying question
  function presentReport(data, image = null, question = '') {
    if (data.tool === 'facts') {
      add({ from: 'bot', kind: 'facts', data });
      data = { ...data, question };
    } else {
      add({ from: 'bot', kind: 'result', data, image });
      if (data.result.reply_draft) add({ from: 'bot', kind: 'reply', text: data.result.reply_draft });
    }
    const q = data.result.clarifying_question;
    if (q) add({ from: 'bot', kind: 'text', text: `🤔 Help me dig deeper: ${q} Just type your answer below.` });
    else add({ from: 'bot', kind: 'text', text: FOLLOWUP_HINT });
    setReport(data);
    setAskHistory(q ? [{ role: 'assistant', content: `Clarifying question I asked: ${q}` }] : []);
  }

  function add(msg) {
    setMessages((m) => [...m, { id: nextId++, ...msg }]);
  }

  async function send(rawText, img, imageUrl = null, echo = true) {
    const { text, url } = splitInput(rawText);
    if (!text && !url && !img && !imageUrl) return;
    if (loading) return;

    if (echo) add({ from: 'me', text: (rawText || '').trim(), image: img || imageUrl });
    setDraft('');
    setImage(null);
    setCheckingPhoto(!!(img || imageUrl));
    setLoadingKind('check');
    setLoading(true);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url, image: img, imageUrl, audience, language, mode: 'fact', tool }),
      });
      const data = await res.json();
      if (data.error || !data.result) {
        add({ from: 'bot', kind: 'error', text: data.error || 'Something went wrong. Try again?' });
      } else {
        presentReport(data, img, (rawText || '').trim());
      }
    } catch {
      add({ from: 'bot', kind: 'error', text: "I couldn't reach the server. Check your connection and try again." });
    }
    setLoading(false);
  }

  // "Is this photo AI?" mode: only the photo agents run
  async function sendPhoto(rawText, img, imageUrl = null, echo = true) {
    if (loading || (!img && !imageUrl)) return;
    if (echo) add({ from: 'me', text: (rawText || '').trim(), image: img || imageUrl });
    setDraft('');
    setImage(null);
    setLoadingKind('photo');
    setLoading(true);
    try {
      const res = await fetch('/api/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: (rawText || '').trim(), image: img, imageUrl, audience, language }),
      });
      const data = await res.json();
      if (data.error || !data.photo) {
        add({ from: 'bot', kind: 'error', text: data.error || 'Something went wrong. Try again?' });
      } else {
        add({ from: 'bot', kind: 'photo', data, image: img, note: (rawText || '').trim() });
        add({ from: 'bot', kind: 'text', text: PHOTO_FOLLOWUP_HINT });
        setReport({ tool: 'photo', photo: data.photo });
        setAskHistory([]);
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

  async function ask(rawQuestion) {
    const question = (rawQuestion || '').trim();
    if (!question || loading || !report) return;
    add({ from: 'me', text: question });
    setDraft('');
    setLoadingKind('ask');
    setLoading(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, report, history: askHistory, audience, language }),
      });
      const data = await res.json();
      if (data.error || !data.answer) {
        add({ from: 'bot', kind: 'error', text: data.error || 'Something went wrong. Try again?' });
      } else {
        add({ from: 'bot', kind: 'answer', text: data.answer, cited: data.cited || [], searchedAgain: data.searchedAgain, question });
        setAskHistory((h) => [...h, { role: 'user', content: question }, { role: 'assistant', content: data.answer }].slice(-8));
        if (data.newSources?.length) {
          setReport((r) => (r ? { ...r, sources: [...(r.sources || []), ...data.newSources] } : r));
        }
      }
    } catch {
      add({ from: 'bot', kind: 'error', text: "I couldn't reach the server. Check your connection and try again." });
    }
    setLoading(false);
  }

  // A photo always starts a new check; otherwise, after a report, messages are follow-up questions
  function submit() {
    if (tool === 'photo') {
      if (image) sendPhoto(draft, image);
      else if (report && draft.trim()) ask(draft);
      else fileRef.current?.click();
      return;
    }
    if (image || !report) send(draft, image);
    else ask(draft);
  }

  // Hands a photo or post to another tool and opens it
  function openTool(target, payload) {
    try {
      sessionStorage.setItem('ff-handoff', JSON.stringify({ tool: target, ...payload }));
    } catch {}
    window.location.href = TOOLS[target].href;
  }

  function newSearch() {
    setMessages([]);
    setReport(null);
    setAskHistory([]);
    setDraft('');
    setImage(null);
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function copy(id, text) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
  }

  const welcome = WELCOME[tool][language] || WELCOME[tool].en;
  const canSend = !loading && (tool === 'photo' ? !!image || (!!report && !!draft.trim()) : draft.trim() || image);

  return (
    <div className="ff">
      <style>{CSS}</style>

      <header className="top">
        <div className="top-in">
          <div>
            <a className="wordmark" href="/" aria-label="Fact or Feed? home">
              fact or feed<span>?</span>
            </a>
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
            <select className="age" value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="How detailed" title="How detailed">
              <option value="everyone">Level</option>
              <option value="simple">Simple</option>
              <option value="complex">Complex</option>
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

      <nav className="toolnav" aria-label="Tools">
        <div className="toolnav-in">
          {TOOL_ORDER.map((t) => (
            <a key={t} href={TOOLS[t].href} className={t === tool ? 'on' : ''} aria-current={t === tool ? 'page' : undefined}>
              {TOOLS[t].icon} <span className="tn-long">{toolName(t, language)}</span>
              <span className="tn-short">{TOOLS[t].short[language] || TOOLS[t].short.en}</span>
            </a>
          ))}
        </div>
      </nav>

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
                  <ResultBubble data={m.data} image={m.image} onPhotoCheck={loading ? null : () => openTool('photo', { image: m.image })} />
                </div>
              );
            }
            if (m.kind === 'photo') {
              return (
                <div key={m.id} className="msg bot">
                  <div className="av sm" aria-label="Vera">V</div>
                  <PhotoResultBubble data={m.data} image={m.image} onFactCheck={loading ? null : () => openTool('credible', { image: m.image, text: m.note })} />
                </div>
              );
            }
            if (m.kind === 'facts') {
              return (
                <div key={m.id} className="msg bot">
                  <div className="av sm" aria-label="Vera">V</div>
                  <FactsBubble data={m.data} />
                </div>
              );
            }
            if (m.kind === 'answer') {
              return (
                <div key={m.id} className="msg bot">
                  <div className="av sm" aria-label="Vera">V</div>
                  <div className="bub">
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                    {m.searchedAgain && <div className="muted" style={{ marginTop: 6 }}>🔎 I searched again to answer this.</div>}
                    {m.cited?.length > 0 && (
                      <ul style={{ marginTop: 8, fontSize: 13 }}>
                        {m.cited.map((c) => (
                          <SourceItem key={c.id} s={c} />
                        ))}
                      </ul>
                    )}
                    <Feedback claims={[`Follow-up question: ${m.question || ''}`]} verdict="follow-up answer" realStory={m.text} />
                  </div>
                </div>
              );
            }
            if (m.kind === 'text') {
              return (
                <div key={m.id} className="msg bot">
                  <div className="av sm" aria-label="Vera">V</div>
                  <div className="bub">{m.text}</div>
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
                <span className="typing-step">{loadingKind === 'ask' ? 'Looking into that…' : steps[Math.min(step, steps.length - 1)]}</span>
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
          {report && !loading && (
            <div className="newrow">
              <span className="muted">Ask about this report, or</span>
              <button className="newsearch" onClick={newSearch}>＋ New search</button>
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
              placeholder={image ? (tool === 'photo' ? 'Add a note (optional)…' : 'Add a note or link (optional)…') : report ? 'Ask Vera about this…' : PLACEHOLDERS[tool]}
              dir="auto"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="circle send" onClick={submit} disabled={!canSend} aria-label="Send">
              ↑
            </button>
          </div>
          <div className="foot">
            Fact or Feed? uses AI and can make mistakes. Always check the sources.
          </div>
        </div>
      </footer>

      {showInstall && (
        <InstallSheet onClose={() => setShowInstall(false)} />
      )}
    </div>
  );
}

