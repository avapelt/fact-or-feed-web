// "How we check" — shows people exactly how Fact or Feed? finds sources and decides who to trust.
// The source lists below are read straight from app/api/check/bias.js, so this page always matches
// what the checker really does. Edit the lists there, not here.
import { RATINGS, FACT_CHECKERS, OFFICIAL } from '../api/check/bias';

export const metadata = {
  title: 'How we check · Fact or Feed?',
  description: 'How Fact or Feed? finds sources, ranks how credible they are, and spots bias.',
};

const LEANS = [
  { name: 'Left', color: '#3B5BA9', text: '#FFFFFF' },
  { name: 'Lean Left', color: '#8EA6D9', text: '#1D1D1F' },
  { name: 'Center', color: '#B9B6C2', text: '#1D1D1F' },
  { name: 'Lean Right', color: '#E3A397', text: '#1D1D1F' },
  { name: 'Right', color: '#B5402F', text: '#FFFFFF' },
];

const STEPS = [
  {
    title: 'Make a game plan',
    body: 'The Manager agent goes first. It looks at what you sent, decides what kind of post it is, and chooses which specialist agents to use, with a reason for each choice. Sometimes the best move isn’t reading 30 articles but going straight to the original source, so the Manager decides that too. A hurricane rumor switches on emergency mode and puts official sources first; and a health claim adds published research.',
  },
  {
    title: 'Find the claims',
    body: 'Following the game plan, the Planner agent reads what you sent (text, a link, or a screenshot), pulls out the 1 to 3 most important claims that can actually be checked, notes who posted it, and writes its own search plan. Opinions are skipped.',
  },
  {
    title: 'Go to the source, or search widely',
    body: 'If the Manager chose the original source, the Researcher goes there first (an agency, election office, school district, or study). Otherwise it runs 10+ searches at the same time: news coverage worded different ways, official sources like government agencies, and published research when the claim is about science, health, or data.',
  },
  {
    title: 'Look for persuasion',
    body: 'In Is this news credible?, the Persuasion Analyst looks at how the post tries to convince you: fear, urgency, outrage, vague "experts say" claims, fake authority, or scam signals.',
  },
  {
    title: 'Check photos (its own mode)',
    body: 'Tap “Is this photo AI?” to run only the photo agents. Three Image agents check it for signs of AI at the same time, a Photo Finder figures out what the photo shows and searches for real photos of it, the Comparison agent compares them, and Vera explains the result in plain words. In the other tools, a screenshot is only read for its claims.',
  },
  {
    title: 'Label every source',
    body: 'Duplicates are removed, then every source gets a label: Research, Official, Fact-check, a political lean, or Not rated. You can see every label in your result.',
  },
  {
    title: 'Weigh the evidence',
    body: 'The Writer agent compares what the sources say, using the credibility tiers below, and writes a verdict, the real story, who posted it, and what is still unknown. Every key source is linked so you can check it yourself.',
  },
  {
    title: 'Double-check it',
    body: 'Before you see anything, a separate Reviewer agent checks the Writer’s answer against the sources, like an editor. If the evidence is weak or a sentence isn’t backed up, it corrects the answer and tells you what it changed.',
  },
  {
    title: 'Answer your questions',
    body: 'After the report, you can ask Vera anything about it. The Follow-up agent answers using the sources already found and cites them. If they don’t cover your question, it decides on its own to search again.',
  },
  {
    title: 'Learn from it',
    body: 'The Bookkeeper agent keeps Vera’s notebook: short, anonymous notes about rumors she has checked and lessons from her mistakes. Lessons come from the Reviewer’s corrections and from your optional 👍/👎 ratings, where you can say which part was wrong. Each lesson is filed under the agent whose job it is, and every agent reads its own lessons before working, so each one gets better at its own job. It never saves names, accounts, contact info, your own words, or photos.',
  },
];

const VERDICTS = [
  ['Accurate', '#2F8F5B', 'The main claim is backed by reliable sources.'],
  ['Missing context', '#7FA83A', 'True, but leaves out something that changes the meaning.'],
  ['Exaggerated', '#D99A2B', 'Starts from something real but blows it up.'],
  ['Misleading', '#D9702F', 'Uses real facts to push a false impression.'],
  ['False', '#C2413B', 'Reliable sources show the claim is wrong.'],
  ["Can't confirm yet", '#6B6A73', 'Not enough reliable coverage to say either way.'],
];

function byLean() {
  const groups = Object.fromEntries(LEANS.map((l) => [l.name, []]));
  for (const [domain, lean] of Object.entries(RATINGS)) groups[lean]?.push(domain);
  return groups;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
.hw{
  --cream:#FBFAF6; --paper:#FFFFFF; --sand:#F4F1FA; --line:#E7E4EC; --ink:#1D1D1F; --muted:#6B6A73;
  --moss:#5B3FA6; --rust:#5B3FA6; --olive:#5B3FA6; --research:#5B3FA6; --fact:#D99A2B;
  --serif:'Poppins',ui-sans-serif,system-ui,sans-serif; --caslon:'Poppins',ui-sans-serif,system-ui,sans-serif;
  --sans:'Poppins',ui-sans-serif,system-ui,-apple-system,sans-serif;
  min-height:100dvh;background:#F6F3FC;color:var(--ink);font-family:var(--sans);line-height:1.55
}
.hw *{box-sizing:border-box}
.hw a{color:var(--rust);text-underline-offset:2px}
.hw-top{background:#EFEAFA;border-bottom:1px solid #DCD4F0;padding:14px 16px}
.hw-top-in{max-width:820px;margin:0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}
.hw-top-in .hw-brand{grid-column:2;text-align:center}
.hw-top-in .hw-back{grid-column:3;justify-self:end}
.hw-brand{white-space:nowrap;font-family:var(--sans);font-weight:800;font-size:40px;line-height:1;letter-spacing:-0.035em;color:var(--ink);text-decoration:none}
.hw-back{border:0;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:600;background:var(--moss);color:#fff !important;text-decoration:none;white-space:nowrap}
.hw a.hw-brand{color:var(--ink)}
@media (max-width:540px){.hw a.hw-brand{font-size:32px}.hw-top-in{grid-template-columns:1fr;justify-items:center;gap:10px}.hw-top-in .hw-brand,.hw-top-in .hw-back{grid-column:1;justify-self:center}}
.hw-main{max-width:820px;margin:0 auto;padding:28px 16px 60px}
.hw h1{font-family:var(--sans);font-weight:800;letter-spacing:-0.035em;font-size:clamp(34px,7vw,52px);line-height:1.05;margin:0 0 12px}
.hw h1 em{font-family:var(--caslon);text-transform:none;font-size:.8em}
.hw .lede{font-family:var(--caslon);font-size:18px;max-width:640px;margin:0}
.hw section{margin-top:44px}
.hw h2{font-family:var(--sans);font-weight:700;font-size:26px;letter-spacing:-0.03em;margin:0 0 6px;border-bottom:1px solid var(--line);padding-bottom:8px}
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
.vtag{display:inline-block;color:#fff;font-family:var(--sans);font-weight:700;font-size:14px;padding:2px 12px;border-radius:999px;margin-bottom:6px}
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
          <a className="hw-brand" href="/">fact or feed<span style={{ color: 'var(--moss)' }}>?</span></a>
          <a className="hw-back" href="/">← Home</a>
        </div>
      </header>

      <main className="hw-main">
        <h1>
          How we check
        </h1>
        <p className="lede">
          Fact or Feed? never trusts a single source without showing you why. Every check labels each source by how
          credible it is and which way it leans, and shows you all of it.
        </p>

        <section>
          <h2>Three tools</h2>
          <div className="callout" style={{ marginTop: 14 }}>
            <b>🔎 Find the facts.</b> Ask a question or name a topic. The Manager decides whether the best move is to go
            straight to the original source (like the elections office for an election date) or to search widely
            across the spectrum. Vera gives the answer, the consensus, and where each piece came from.
          </div>
          <div className="callout">
            <b>📰 Is this news credible?</b> Paste a link, a post, or a screenshot. You get who published it and how
            they lean, the persuasion tactics it uses, and a separate check of whether the facts are accurate. Leaning
            left or right doesn’t make something false.
          </div>
          <div className="callout">
            <b>🤖 Is this photo AI?</b> Add a photo. Only the photo agents run: they look for AI warning signs, judge
            how believable the scene is, and compare it with real photos online.
          </div>
        </section>

        <section>
          <h2>What happens when you hit send</h2>
          <p className="sub">For Find the facts and Is this news credible?</p>
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
            badge={<Badge color="#5B3FA6" text="#FFFFFF">Research</Badge>}
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

          <Tier rank="Tier 1" name="Official sources" badge={<Badge color="#2F8F5B" text="#FFFFFF">Official</Badge>}>
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

          <Tier rank="Tier 2" name="Fact-checkers" badge={<Badge color="#D99A2B" text="#1D1D1F">Fact-check</Badge>}>
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

          <Tier rank="Tier 4" name="Not rated" badge={<Badge color="#E2E0E6" text="#1D1D1F">Not rated</Badge>}>
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
            <b>Who posted it matters.</b> We tell you whether a post comes from a news outlet, an official source, a satire
            site, a creator, or an anonymous account. We only use names shown in the post, and we never look up a
            private person.
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
            Checking a photo is its own mode, separate from fact-checking. Tap <b>Is this photo AI?</b>, add a
            picture, and only the photo agents run. After either check, one tap runs the other on the same photo.
          </p>
          <div className="callout" style={{ marginTop: 14 }}>
            <b>Warning signs.</b> The Image agent looks for signs of AI or editing (warped hands or text, odd lighting,
            strange reflections, plastic-looking skin) and asks whether the scene is even believable. A cat skydiving is
            very unlikely. It does this <b>three separate times</b> and goes with the middle answer, so one odd result
            can't flip it.
          </div>
          <div className="callout">
            <b>Comparing with real photos.</b> The Photo Finder figures out what the picture shows, and the Comparison agent searches for real photos of the same scene and
            compares them side by side. This can catch AI images and also <b>old photos being reposted as new</b>, which
            is common during hurricanes.
          </div>
          <p className="sub" style={{ marginTop: 14 }}>
            We rate the result Low, Medium, or High chance of AI, but{' '}
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
            <li>Vera's notebook only keeps anonymous, general notes, never personal information.</li>
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
