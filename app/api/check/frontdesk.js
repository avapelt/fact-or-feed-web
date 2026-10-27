// 👋 The Front desk: the first stop for every message, before the notebook, link reading, or the Manager.
// 1. Plain greetings and thanks (in all 11 languages) get an instant reply from code. No AI, free.
// 2. Everything else goes to a small, fast AI step that only decides: check, chat, blocked, or self_harm.

// Words that make up a plain greeting or thanks, by language. A message counts as a greeting only if
// it is made ONLY of these (plus punctuation and emoji), so "hi, is this true: ..." is NOT a greeting.
const GREETINGS = {
  en: ['hi', 'hii', 'hiii', 'hello', 'hey', 'heya', 'hiya', 'yo', 'sup', 'howdy', 'good morning', 'good afternoon', 'good evening', 'how are you', 'how r u', 'how are u', 'whats up', "what's up", 'thanks', 'thank you', 'thx', 'ty', 'thanks a lot', 'thank you so much', 'thanks so much', 'vera', 'hi there', 'hey there', 'hello there'],
  es: ['hola', 'buenas', 'buenos dias', 'buenos días', 'buenas tardes', 'buenas noches', 'que tal', 'qué tal', 'como estas', 'cómo estás', 'como está', 'cómo está', 'gracias', 'muchas gracias', 'mil gracias'],
  ht: ['bonjou', 'bonswa', 'alo', 'sak pase', 'sa k pase', 'kijan ou ye', 'kòman ou ye', 'koman ou ye', 'mèsi', 'mesi', 'mèsi anpil', 'mesi anpil'],
  zh: ['你好', '您好', '嗨', '哈喽', '早上好', '晚上好', '你好吗', '谢谢', '谢谢你', '多谢', '感谢'],
  hi: ['नमस्ते', 'नमस्कार', 'हेलो', 'हैलो', 'आप कैसे हैं', 'कैसे हो', 'धन्यवाद', 'शुक्रिया', 'namaste'],
  ar: ['مرحبا', 'مرحبًا', 'أهلا', 'أهلًا', 'اهلا', 'السلام عليكم', 'صباح الخير', 'مساء الخير', 'كيف حالك', 'شكرا', 'شكرًا', 'شكرا جزيلا', 'شكرًا جزيلًا'],
  fr: ['bonjour', 'salut', 'bonsoir', 'coucou', 'ça va', 'ca va', 'comment ça va', 'comment ca va', 'comment vas-tu', 'merci', 'merci beaucoup'],
  bn: ['হ্যালো', 'নমস্কার', 'আসসালামু আলাইকুম', 'কেমন আছো', 'কেমন আছেন', 'ধন্যবাদ', 'অনেক ধন্যবাদ'],
  it: ['ciao', 'salve', 'buongiorno', 'buonasera', 'come stai', 'come va', 'grazie', 'grazie mille'],
  pt: ['oi', 'oie', 'olá', 'ola', 'e aí', 'e ai', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'tudo bom', 'como vai', 'obrigado', 'obrigada', 'muito obrigado', 'muito obrigada', 'valeu'],
  ja: ['こんにちは', 'こんばんは', 'おはよう', 'おはようございます', 'やあ', 'はじめまして', '元気', 'お元気ですか', '元気ですか', 'ありがとう', 'ありがとうございます', 'どうも', 'どうもありがとう'],
};
const THANKS = /thank|thx|^ty$|gracias|m[eè]si|谢|धन्यवाद|शुक्रिया|شكر|merci|ধন্যবাদ|grazie|obrigad|valeu|ありがと|どうも/i;

const HELLO_REPLY = {
  en: "Hi! 👋 I'm Vera. Send me a question, a post, a link, or a photo and I'll check the facts with you.",
  es: '¡Hola! 👋 Soy Vera. Envíame una pregunta, una publicación, un enlace o una foto y revisaré los hechos contigo.',
  ht: 'Bonjou! 👋 Mwen se Vera. Voye yon kesyon, yon post, yon lyen oswa yon foto ban mwen, epi m ap tcheke fè yo avè w.',
  zh: '你好！👋 我是 Vera。发给我一个问题、帖子、链接或照片，我会和你一起核查事实。',
  hi: 'नमस्ते! 👋 मैं वेरा हूँ। मुझे कोई सवाल, पोस्ट, लिंक या फ़ोटो भेजें और मैं आपके साथ तथ्य जाँचूँगी।',
  ar: 'مرحبًا! 👋 أنا فيرا. أرسل لي سؤالًا أو منشورًا أو رابطًا أو صورة وسأتحقق من الحقائق معك.',
  fr: 'Salut ! 👋 Je suis Vera. Envoie-moi une question, une publication, un lien ou une photo et je vérifierai les faits avec toi.',
  bn: 'হ্যালো! 👋 আমি ভেরা। আমাকে একটা প্রশ্ন, পোস্ট, লিংক বা ছবি পাঠাও, আমি তোমার সাথে তথ্য যাচাই করব।',
  it: 'Ciao! 👋 Sono Vera. Mandami una domanda, un post, un link o una foto e controllerò i fatti con te.',
  pt: 'Oi! 👋 Eu sou a Vera. Me mande uma pergunta, um post, um link ou uma foto e eu verifico os fatos com você.',
  ja: 'こんにちは！👋 Veraです。質問、投稿、リンク、写真を送ってくれたら、一緒に事実を確認します。',
};
const THANKS_REPLY = {
  en: "You're welcome! 😊 Send me anything else you'd like me to check.",
  es: '¡De nada! 😊 Envíame cualquier otra cosa que quieras que revise.',
  ht: 'Pa gen pwoblèm! 😊 Voye nenpòt lòt bagay ou vle m tcheke.',
  zh: '不客气！😊 还有什么想让我核查的，尽管发给我。',
  hi: 'आपका स्वागत है! 😊 और कुछ जाँचना हो तो मुझे भेजें।',
  ar: 'على الرحب والسعة! 😊 أرسل لي أي شيء آخر تريد أن أتحقق منه.',
  fr: 'De rien ! 😊 Envoie-moi autre chose à vérifier quand tu veux.',
  bn: 'স্বাগতম! 😊 আর কিছু যাচাই করতে চাইলে আমাকে পাঠাও।',
  it: 'Prego! 😊 Mandami pure qualsiasi altra cosa da controllare.',
  pt: 'De nada! 😊 Me mande qualquer outra coisa que você queira que eu verifique.',
  ja: 'どういたしまして！😊 ほかに確認したいものがあれば送ってください。',
};

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\p{Extended_Pictographic}‍️]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Every phrase, longest first, with its language
const PHRASES = Object.entries(GREETINGS)
  .flatMap(([lang, list]) => list.map((p) => [norm(p), lang]))
  .filter(([p]) => p)
  .sort((a, b) => b[0].length - a[0].length);

// Returns { lang, thanks } for a plain greeting or thanks, otherwise null
export function detectGreeting(raw) {
  const original = String(raw || '');
  if (!original.trim() || original.length > 80 || /https?:\/\/|www\./i.test(original)) return null;
  let rest = norm(original);
  if (!rest) return null;
  let lang = null;
  let matched = false;
  // Peel off known phrases from the start until nothing is left
  while (rest) {
    const hit = PHRASES.find(([p]) => rest === p || rest.startsWith(p + ' ') || (/[^\x00-\x7F]/.test(p) && rest.startsWith(p)));
    if (!hit) return null;
    if (!lang || (lang === 'en' && hit[1] !== 'en')) lang = hit[1];
    matched = true;
    rest = rest.slice(hit[0].length).trim();
  }
  if (!matched) return null;
  return { lang, thanks: THANKS.test(norm(original)) && !/hi|hello|hola|bonjou|你好|नमस्ते|مرحب|bonjour|ciao|হ্যালো|\boi\b|ol[aá]|こんにちは|こんばんは|おはよう/.test(norm(original)) };
}

// The instant reply, in the language the user picked (or the language of the greeting)
export function greetingReply(found, pickedLang) {
  const lang = HELLO_REPLY[pickedLang] ? pickedLang : found.lang || 'en';
  return (found.thanks ? THANKS_REPLY : HELLO_REPLY)[lang] || HELLO_REPLY.en;
}
