// Approximate media bias ratings. Check each one on AllSides.com before your demo and edit if needed.
export const RATINGS = {
  'msnbc.com': 'Left',
  'huffpost.com': 'Left',
  'motherjones.com': 'Left',
  'vox.com': 'Left',
  'cnn.com': 'Left',
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
  'reuters.com': 'Center',
  'bbc.com': 'Center',
  'bbc.co.uk': 'Center',
  'thehill.com': 'Center',
  'wsj.com': 'Center',
  'forbes.com': 'Center',
  'csmonitor.com': 'Center',
  'nypost.com': 'Lean Right',
  'washingtonexaminer.com': 'Lean Right',
  'washingtontimes.com': 'Lean Right',
  'foxbusiness.com': 'Lean Right',
  'reason.com': 'Lean Right',
  'foxnews.com': 'Right',
  'breitbart.com': 'Right',
  'dailywire.com': 'Right',
  'newsmax.com': 'Right',
  'theblaze.com': 'Right',
  'dailycaller.com': 'Right',
};

export const FACT_CHECKERS = ['politifact.com', 'snopes.com', 'factcheck.org', 'fullfact.org', 'leadstories.com'];

export const OFFICIAL = [
  'miamidade.gov', 'dadeschools.net', 'weather.gov', 'noaa.gov', 'fema.gov',
  'floridadisaster.org', 'cdc.gov', 'nih.gov', 'who.int', 'un.org', 'myflorida.com',
];

function matches(domain, list) {
  return list.find((d) => domain === d || domain.endsWith('.' + d));
}

export function categorize(source) {
  let domain = '';
  try {
    domain = new URL(source.url).hostname.replace(/^www\./, '');
  } catch {}

  if (source.research) return { domain: source.journal || domain, category: 'Research' };
  if (domain.endsWith('.gov') || domain.includes('.gov.') || matches(domain, OFFICIAL)) {
    return { domain, category: 'Official' };
  }
  if (matches(domain, FACT_CHECKERS)) return { domain, category: 'Fact-check' };

  const rated = matches(domain, Object.keys(RATINGS));
  return { domain, category: rated ? RATINGS[rated] : 'Not rated' };
}
