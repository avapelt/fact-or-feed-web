// "How we check" — shows people exactly how Fact or Feed? finds sources and decides who to trust.
// The source lists below are read straight from app/api/check/bias.js, so this page always matches
// what the checker really does. Edit the lists there, not here.
import { RATINGS, FACT_CHECKERS, OFFICIAL } from '../api/check/bias';

export const metadata = {
  title: 'How we check · Fact or Feed?',
  description: 'How Fact or Feed? finds sources, ranks how credible they are, and spots bias.',
};

const LEANS = [
  { name: 'Left', color: '#2f4a6d', text: '#efeadf' },
  { name: 'Lean Left', color: '#8fa5c2', text: '#1c1a17' },
  { name: 'Center', color: '#b3ad9c', text: '#1c1a17' },
  { name: 'Lean Right', color: '#d29a86', text: '#1c1a17' },
  { name: 'Right', color: '#8c2f1f', text: '#efeadf' },
];

const STEPS = [
  {
    title: 'Read it',
    body: 'The AI reads what you sent (text, a link, or a screenshot) and pulls out the 1 to 3 most important claims that can actually be checked. Opinions are skipped.',
  },
  {
    title: 'Search widely',
    body: 'It runs several different searches at once: news coverage worded different ways, official sources like government agencies, and published research when the claim is about science, health, or data.',
  },
  {
    title: 'Label every source',
    body: 'Duplicates are removed, then every source gets a label: Research, Official, Fact-check, a political lean, or Not rated. You can see every label in your result.',
  },
  {
    title: 'Look for persuasion',
    body: 'Separately, it looks at how the post tries to convince you: fear, urgency, outrage, vague "experts say" claims, fake authority, or scam signals.',
  },
  {
    title: 'Weigh the evidence',
    body: 'The AI compares what the sources say, using the credibility tiers below, and writes a verdict, the real story, and what is still unknown. Every key source is linked so you can check it yourself.',
  },
];

const VERDICTS = [
  ['Accurate', '#4f6b3a', 'The main claim is backed by reliable sources.'],
  ['Missing context', '#9a9a2e', 'True, but leaves out something that changes the meaning.'],
  ['Exaggerated', '#c08a2e', 'Starts from something real but blows it up.'],
  ['Misleading', '#b0602f', 'Uses real facts to push a false impression.'],
  ['False', '#8c2f1f', 'Reliable sources show the claim is wrong.'],
  ["Can't confirm yet", '#6f6858', 'Not enough reliable coverage to say either way.'],
];

function byLean() {
  const groups = Object.fromEntries(LEANS.map((l) => [l.name, []]));
  for (const [domain, lean] of Object.entries(RATINGS)) groups[lean]?.push(domain);
  return groups;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');
.hw{
  --cream:#efeadf; --paper:#f7f4ec; --sand:#e4dccb; --line:#d6cdb8; --ink:#1c1a17; --muted:#6f6858;
  --moss:#4f6b3a; --rust:#7a4426; --olive:#8f7f45; --research:#6b5a8e; --fact:#c9a03a;
  --serif:'DM Serif Display',Georgia,serif; --caslon:'Libre Caslon Text',Georgia,serif;
  --sans:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;
  min-height:100dvh;background:var(--cream);color:var(--ink);font-family:var(--sans);line-height:1.55
}
.hw *{box-sizing:border-box}
.hw a{color:var(--rust);text-underline-offset:2px}
.hw-top{border-bottom:1.5px solid var(--ink);padding:12px 16px}
.hw-top-in{max-width:820px;margin:0 auto;display:flex;align-items:center;gap:12px}
.hw-av{width:40px;height:40px;border-radius:50%;background:var(--rust);color:var(--cream);font-family:var(--serif);font-size:16px;display:grid;place-items:center;text-decoration:none;flex-shrink:0}
.hw-brand{white-space:nowrap;font-family:var(--serif);font-size:22px;text-transform:uppercase;letter-spacing:.5px;color:var(--ink);text-decoration:none}
.hw-back{margin-left:auto;border:1px solid var(--ink);padding:7px 12px;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;background:var(--moss);color:var(--cream) !important;text-decoration:none;white-space:nowrap}
.hw-main{max-width:820px;margin:0 auto;padding:28px 16px 60px}
.hw h1{font-family:var(--serif);font-weight:400;font-size:clamp(34px,7vw,52px);line-height:1.05;text-transform:uppercase;margin:0 0 12px}
.hw h1 em{font-family:var(--caslon);text-transform:none;font-size:.8em}
.hw .lede{font-family:var(--caslon);font-size:18px;max-width:640px;margin:0}
.hw section{margin-top:44px}
.hw h2{font-family:var(--serif);font-weight:400;font-size:28px;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px;border-bottom:1.5px solid var(--ink);padding-bottom:6px}
.hw .sub{color:var(--muted);margin:8px 0 16px}
.steps{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.steps li{display:flex;gap:14px;background:var(--paper);border:1px solid var(--line);padding:14px 16px}
.num{font-family:var(--serif);font-size:28px;line-height:1;color:var(--moss);min-width:26px}
.steps b{font-family:var(--caslon);font-size:16px}
.steps p{margin:4px 0 0;font-size:15px}
.tier{border:1.5px solid var(--ink);background:var(--paper);margin-top:14px}
.tier-head{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.tier-rank{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:var(--muted)}
.tier-name{font-family:var(--caslon);font-weight:700;font-size:18px}
.tier-body{padding:12px 14px;font-size:15px}
.tier-body p{margin:0 0 8px}
.badge{display:inline-block;font-size:11px;padding:2px 9px;border-radius:999px;font-weight:700;white-space:nowrap}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.chip{font-size:12.5px;background:var(--cream);border:1px solid var(--line);padding:2px 8px}
.meter{display:flex;height:10px;margin:10px 0 4px}
.meter div{flex:1}
.lean-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}
.lean-col{background:var(--cream);border:1px solid var(--line);padding:8px}
.lean-col .badge{margin-bottom:6px}
.lean-col ul{list-style:none;padding:0;margin:0;font-size:12.5px;overflow-wrap:anywhere}
.lean-col li{margin:2px 0}
.callout{background:var(--sand);border-left:4px solid var(--moss);padding:12px 14px;margin:12px 0 0;font-size:15px}
.callout b{font-family:var(--caslon)}
.verdicts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
.verdict{background:var(--paper);border:1px solid var(--line);padding:10px 12px;font-size:14px}
.vtag{display:inline-block;color:var(--cream);font-family:var(--serif);text-transform:uppercase;font-size:15px;padding:2px 10px;margin-bottom:6px}
.rules{padding-left:20px;margin:0}
.rules li{margin:6px 0}
.hw-foot{text-align:center;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:48px}
@media (max-width:640px){.lean-grid{grid-template-columns:1fr 1fr}.hw-brand{font-size:17px}}
`;

function Badge({ color, text, children }) {
  return (
    <span className="badge" style={{ background: color, color: text }}>
      {children}
    </span>
  );
}

function Tier({ rank, name, badge, children }) {
  return (
    <div className="tier">
      <div className="tier-head">
        <span className="tier-rank">{rank}</span>
        <span className="tier-name">{name}</span>
        <span style={{ marginLeft: 'auto' }}>{badge}</span>
      </div>
      <div className="tier-body">{children}</div>
    </div>
  );
}

export default function HowItWorks() {
  const leans = byLean();

  return (
    <div className="hw">
      <style>{CSS}</style>

      <header className="hw-top">
        <div className="hw-top-in">
          <a className="hw-av" href="/">F?</a>
          <a className="hw-brand" href="/">Fact or Feed?</a>
          <a className="hw-back" href="/">← Check something</a>
        </div>
      </header>

      <main className="hw-main">
        <h1>
          How we check <em>— no black box.</em>
        </h1>
        <p className="lede">
          Fact or Feed? never trusts a single source. Every check searches news, official sources, and published
          research, labels each source by how credible it is and which way it leans, and shows you all of it.
        </p>

        <section>
          <h2>What happens when you hit send</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="num">{i + 1}</span>
                <div>
                  <b>{s.title}</b>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>Tiers of credibility</h2>
          <p className="sub">
            Not every source counts the same. Here is how we rank them, from strongest evidence to weakest.
          </p>

          <Tier
            rank="Tier 1"
            name="Published research"
            badge={<Badge color="#6b5a8e" text="#efeadf">Research</Badge>}
          >
            <p>
              Journal articles found through <a href="https://openalex.org" target="_blank" rel="noreferrer">OpenAlex</a>,
              a free index of scholarly work. Research published in journals is usually <b>peer-reviewed</b>, meaning
              other experts checked it before it was published. This is the strongest evidence for claims about
              science, health, and data.
            </p>
            <p className="muted" style={{ color: 'var(--muted)', margin: 0 }}>
              Being indexed doesn't guarantee peer review, so we always show the journal name for you to check.
            </p>
          </Tier>

          <Tier rank="Tier 1" name="Official sources" badge={<Badge color="#4f6b3a" text="#efeadf">Official</Badge>}>
            <p>
              Government agencies, schools, and emergency services. Any <b>.gov</b> site counts, plus these:
            </p>
            <div className="chips">
              {OFFICIAL.map((d) => (
                <span key={d} className="chip">{d}</span>
              ))}
            </div>
            <p style={{ marginTop: 10, marginBottom: 0 }}>
              The strongest evidence for local news, breaking news, and emergencies.
            </p>
          </Tier>

          <Tier rank="Tier 2" name="Fact-checkers" badge={<Badge color="#c9a03a" text="#1c1a17">Fact-check</Badge>}>
            <p>Organizations whose whole job is checking claims and showing their sources:</p>
            <div className="chips">
              {FACT_CHECKERS.map((d) => (
                <span key={d} className="chip">{d}</span>
              ))}
            </div>
          </Tier>

          <Tier
            rank="Tier 3"
            name="News outlets, labeled by lean"
            badge={
              <span style={{ display: 'inline-flex', gap: 3 }}>
                {LEANS.map((l) => (
                  <span key={l.name} style={{ width: 14, height: 14, borderRadius: 999, background: l.color, display: 'inline-block' }} />
                ))}
              </span>
            }
          >
            <p>
              News outlets are labeled by their political lean, from Left to Right. One outlet alone isn't enough.
              A claim counts as strongly supported when <b>independent outlets from different sides agree</b>. If the
              coverage mostly comes from one side, the result says so.
            </p>
            <div className="meter">
              {LEANS.map((l) => (
                <div key={l.name} style={{ background: l.color }} />
              ))}
            </div>
            <div className="lean-grid">
              {LEANS.map((l) => (
                <div key={l.name} className="lean-col">
                  <Badge color={l.color} text={l.text}>{l.name}</Badge>
                  <ul>
                    {leans[l.name].map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="callout">
              <b>Bias is not the same as accuracy.</b> A Left- or Right-leaning outlet can still report facts correctly.
              The lean tells you which stories it picks and how it frames them. That's why we look for agreement
              across the whole spectrum instead of trusting one side.
            </div>
          </Tier>

          <Tier rank="Tier 4" name="Not rated" badge={<Badge color="#d9d2c1" text="#1c1a17">Not rated</Badge>}>
            <p style={{ margin: 0 }}>
              Blogs, social media, small sites, and anything we don't have a rating for. These count the least. On
              their own they can't make a claim strongly supported. They need backing from a higher tier.
            </p>
          </Tier>

          <p className="sub" style={{ marginTop: 14 }}>
            Our lean labels are approximate and based on published media bias ratings such as{' '}
            <a href="https://www.allsides.com/media-bias/ratings" target="_blank" rel="noreferrer">AllSides</a>. The full
            list is shown above so you can check it yourself.
          </p>
        </section>

        <section>
          <h2>Extra checks on every source</h2>
          <div className="callout" style={{ marginTop: 14 }}>
            <b>One story, copied 20 times, is still one source.</b> When many outlets repeat the same original report,
            it counts once.
          </div>
          <div className="callout">
            <b>Dates matter.</b> Old stories are often reposted as if they were new, so dates are checked.
          </div>
          <div className="callout">
            <b>Nothing is made up.</b> The AI may only cite sources from the list it actually found. Every source in
            your result links to the real page.
          </div>
        </section>

        <section>
          <h2>What the verdicts mean</h2>
          <div className="verdicts" style={{ marginTop: 14 }}>
            {VERDICTS.map(([name, color, desc]) => (
              <div key={name} className="verdict">
                <span className="vtag" style={{ background: color }}>{name}</span>
                <div>{desc}</div>
              </div>
            ))}
          </div>
          <p className="sub" style={{ marginTop: 14 }}>
            Next to each verdict you'll see a <b>consensus level</b> (Strong, Mixed, Weak, or None yet) showing how much
            reliable sources agree and how much of the spectrum they cover.
          </p>
        </section>

        <section>
          <h2>Images & AI</h2>
          <p className="sub">
            When you send a picture, we look for warning signs of AI or editing: warped hands or text, odd lighting,
            strange reflections, plastic-looking skin. We rate it Low, Medium, or High chance of AI, but{' '}
            <b>we never say an image is definitely fake or definitely real</b>. No tool can know that for sure.
          </p>
        </section>

        <section>
          <h2>Our rules</h2>
          <ul className="rules" style={{ marginTop: 14 }}>
            <li>We stay neutral on politics and never tell you which side to take.</li>
            <li>If something can't be confirmed, we say so.</li>
            <li>In emergencies we point you to official sources like Miami-Dade Emergency Management and the National Weather Service.</li>
            <li>We warn you when a post asks for money or personal information.</li>
            <li>No personal medical, legal, or money advice.</li>
            <li>We never post or send anything for you. The reply we write is just a suggestion.</li>
            <li>Photos you share are deleted once the check finishes.</li>
          </ul>
          <div className="callout" style={{ borderLeftColor: 'var(--rust)' }}>
            <b>Our limits.</b> Fact or Feed? uses AI, and AI can make mistakes. Some social media posts are hidden behind
            logins, and very new stories may not have coverage yet. That's why we show every source: always check
            them yourself.
          </div>
        </section>

        <div className="hw-foot">
          <a href="/">← Back to Fact or Feed?</a>
        </div>
      </main>
    </div>
  );
}
