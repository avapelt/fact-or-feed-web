// Approximate media bias ratings, based on well-known AllSides / Ad Fontes-style ratings.
// They are approximate and change over time: check AllSides.com and edit if needed.
// The list is balanced so the Left, Center and Right each have similar coverage.
export const RATINGS = {
  // Left
  'msnbc.com': 'Left',
  'huffpost.com': 'Left',
  'motherjones.com': 'Left',
  'vox.com': 'Left',
  'cnn.com': 'Left',
  // Lean Left
  'nytimes.com': 'Lean Left',
  'washingtonpost.com': 'Lean Left',
  'npr.org': 'Lean Left',
  'nbcnews.com': 'Lean Left',
  'cbsnews.com': 'Lean Left',
  'abcnews.go.com': 'Lean Left',
  'theguardian.com': 'Lean Left',
  'politico.com': 'Lean Left',
  'usatoday.com': 'Lean Left',
  'bloomberg.com': 'Lean Left',
  'time.com': 'Lean Left',
  'latimes.com': 'Lean Left',
  'apnews.com': 'Lean Left',
  'axios.com': 'Lean Left',
  'miamiherald.com': 'Lean Left',
  // Center
  'reuters.com': 'Center',
  'bbc.com': 'Center',
  'bbc.co.uk': 'Center',
  'thehill.com': 'Center',
  'wsj.com': 'Center',
  'forbes.com': 'Center',
  'csmonitor.com': 'Center',
  'newsnationnow.com': 'Center',
  'upi.com': 'Center',
  'ft.com': 'Center',
  'newsweek.com': 'Center',
  'fortune.com': 'Center',
  'semafor.com': 'Center',
  'deseret.com': 'Center',
  'readtangle.com': 'Center',
  'pewresearch.org': 'Center',
  // Lean Right
  'nypost.com': 'Lean Right',
  'washingtonexaminer.com': 'Lean Right',
  'washingtontimes.com': 'Lean Right',
  'foxbusiness.com': 'Lean Right',
  'reason.com': 'Lean Right',
  'realclearpolitics.com': 'Lean Right',
  'thedispatch.com': 'Lean Right',
  'thefp.com': 'Lean Right',
  'justthenews.com': 'Lean Right',
  'telegraph.co.uk': 'Lean Right',
  // Right
  'foxnews.com': 'Right',
  'breitbart.com': 'Right',
  'dailywire.com': 'Right',
  'newsmax.com': 'Right',
  'theblaze.com': 'Right',
  'dailycaller.com': 'Right',
  'nationalreview.com': 'Right',
  'thefederalist.com': 'Right',
  'freebeacon.com': 'Right',
  'townhall.com': 'Right',
  'theepochtimes.com': 'Right',
};

export const FACT_CHECKERS = ['politifact.com', 'snopes.com', 'factcheck.org', 'fullfact.org', 'leadstories.com'];

export const OFFICIAL = [
  'miamidade.gov', 'dadeschools.net', 'weather.gov', 'noaa.gov', 'fema.gov',
  'floridadisaster.org', 'cdc.gov', 'nih.gov', 'who.int', 'un.org', 'myflorida.com',
];

// Government sites of clearly democratic countries (kept short and simple on purpose)
export const DEMOCRATIC_GOV = [
  'gov.uk', 'gov.au', 'govt.nz', 'gc.ca', 'canada.ca', 'gov.ie', 'gouv.fr', 'bund.de',
  'gov.it', 'gob.es', 'go.jp', 'go.kr', 'overheid.nl', 'government.nl', 'gov.pt', 'admin.ch',
];

// Government sites and outlets run by governments without a free press
export const STATE_MEDIA = [
  'gov.cn', 'gov.ru', 'gov.ir', 'gov.kp', 'gov.by', 'gov.sy', 'kremlin.ru', 'mid.ru',
  'rt.com', 'sputniknews.com', 'tass.com', 'tass.ru', 'xinhuanet.com', 'news.cn', 'globaltimes.cn',
  'cgtn.com', 'chinadaily.com.cn', 'presstv.ir', 'tasnimnews.com', 'irna.ir', 'kcna.kp',
];

// Political parties' own sites (self-published: shown, but never counted as independent evidence)
export const SELF_PUBLISHED = 'Campaign / party (self-published)';
export const PARTY_DOMAINS = [
  'democrats.org', 'dnc.org', 'gop.com', 'rnc.org', 'lp.org', 'gp.org', 'dccc.org', 'nrcc.org', 'dscc.org', 'nrsc.org',
  'conservatives.com', 'labour.org.uk', 'libdems.org.uk', 'snp.org', 'reformparty.uk', 'liberal.ca', 'conservative.ca', 'ndp.ca',
];

// Nonpartisan references used for balanced political searches (never Wikipedia)
export const NONPARTISAN = ['ballotpedia.org', 'votesmart.org', 'congress.gov', 'fec.gov', 'vote.org', 'usa.gov', 'opensecrets.org', 'govtrack.us'];

// Is this domain a campaign or party site? names: candidate or party names from the question
export function isCampaignDomain(domain, names = []) {
  if (!domain) return false;
  if (matches(domain, PARTY_DOMAINS)) return true;
  const label = (domain.split('.').slice(-2, -1)[0] || '').replace(/-/g, '');
  // "forsmith.com", "votesmith.com", "smith2028.com", "janesmith.com": only when it contains a named candidate or party
  const rest = label.replace(/^(for|vote|elect|reelect|team)/, '').replace(/(20\d\d|forcongress|forsenate|forpresident)$/, '');
  return names.some((n) => {
    const parts = String(n || '').toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean);
    const full = parts.join('');
    const last = parts[parts.length - 1] || '';
    return (full.length >= 5 && label.includes(full)) || (last.length >= 4 && rest === last);
  });
}

function matches(domain, list) {
  return list.find((d) => domain === d || domain.endsWith('.' + d));
}

// political: only political checks look for campaign sites, so other checks behave exactly as before
export function categorize(source, { political = false, names = [] } = {}) {
  let domain = '';
  try {
    domain = new URL(source.url).hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  } catch {}

  if (source.research) return { domain: source.journal || domain, category: 'Research' };
  if (matches(domain, STATE_MEDIA)) return { domain, category: 'State media/government' };
  // .gov (with nothing after it) is only used by US federal, state, and local governments
  if (domain.endsWith('.gov') || domain.endsWith('.mil') || matches(domain, OFFICIAL) || matches(domain, DEMOCRATIC_GOV)) {
    return { domain, category: 'Official' };
  }
  // Any other foreign government site isn't rated
  if (/(^|\.)(gov|gob|gouv|govt)\.[a-z]{2,3}$/.test(domain) || /\.gov\.[a-z]{2}(\.|$)/.test(domain)) return { domain, category: 'Not rated' };
  if (matches(domain, FACT_CHECKERS)) return { domain, category: 'Fact-check' };

  const rated = matches(domain, Object.keys(RATINGS));
  if (!rated && political && isCampaignDomain(domain, names)) return { domain, category: SELF_PUBLISHED, self_published: true };
  return { domain, category: rated ? RATINGS[rated] : 'Not rated' };
}
