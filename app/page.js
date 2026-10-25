'use client';
import { useState, useEffect } from 'react';

const STEPS = [
  'Reading what you sent and planning searches',
  'Searching 30+ news sources across the spectrum',
  'Checking official sources and published research',
  'Spotting persuasion tactics',
  'Weighing the evidence',
  'Writing the real story',
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

const CSS = `
.ff{min-height:100vh;background:#f6f4ef;color:#1b1b1f;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.55}
.ff *{box-sizing:border-box}
.wrap{max-width:760px;margin:0 auto;padding:32px 16px 64px}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#ec4899);color:#fff;font-weight:800;display:grid;place-items:center;font-size:18px}
.ff h1{font-size:32px;margin:0;letter-spacing:-0.02em}
.tag{color:#6b6b76;margin:6px 0 20px}
.card{background:#fff;border:1px solid #e7e4dc;border-radius:18px;padding:20px;margin-top:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.card h3{margin:0 0 10px;font-size:17px}
.tabs{display:flex;gap:6px;background:#f1efe8;padding:4px;border-radius:12px;margin-bottom:12px}
.tab{flex:1;border:0;background:transparent;padding:8px;border-radius:9px;font-size:14px;font-weight:600;color:#6b6b76;cursor:pointer}
.tab.on{background:#fff;color:#1b1b1f;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.field{width:100%;border:1px solid #e7e4dc;border-radius:12px;padding:12px;font-size:16px;font-family:inherit;background:#fcfbf8}
.field:focus{outline:2px solid #4f46e5;border-color:transparent}
.drop{border:2px dashed #d9d5ca;border-radius:12px;padding:20px;text-align:center;color:#6b6b76;display:block;cursor:pointer}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}
.select{border:1px solid #e7e4dc;border-radius:10px;padding:10px;font-size:14px;background:#fff}
.go{margin-left:auto;border:0;border-radius:12px;padding:12px 22px;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,#4f46e5,#7c3aed);cursor:pointer}
.go:disabled{opacity:.5;cursor:not-allowed}
.steps{list-style:none;padding:0;margin:0}
.steps li{padding:5px 0;color:#a3a3ad}
.steps li.done{color:#16a34a}
.steps li.now{color:#1b1b1f;font-weight:600}
.spin{display:inline-block;width:12px;height:12px;border:2px solid #c7c3f5;border-top-color:#4f46e5;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;vertical-align:-1px}
@keyframes spin{to{transform:rotate(360deg)}}
.label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b6b76;font-weight:700}
.big{font-size:28px;font-weight:800;margin:2px 0 6px;letter-spacing:-0.02em}
.pill{display:inline-block;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:600;background:#eef2ff;color:#3730a3;margin-right:6px}
.muted{color:#6b6b76;font-size:13px}
.reply{background:#eef2ff;border-radius:12px;padding:14px;margin:0 0 10px}
.btn{border:1px solid #e7e4dc;background:#fff;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer}
.ff ul,.ff ol{padding-left:20px;margin:0}
.ff li{margin:4px 0}
.ff a{color:#4f46e5}
.warn{background:#fff7e6;border-color:#f5d48a}
.err{background:#fdecec;border-color:#f3b4b4;color:#9b1c1c}
@media (max-width:520px){.ff h1{font-size:26px}.go{width:100%;margin-left:0}}
`;

function Badge({ category }) {
  return (
    <span
      style={{
        background: COLORS[category] || '#d1d5db',
        color: DARK.includes(category) ? '#111' : '#fff',
        fontSize: 12,
        padding: '2px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        fontWeight: 600,
      }}
    >
      {category}
    </span>
  );
}

function Card({ icon, title, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <h3>
          {icon} {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Meter({ labels, colors, active }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
      {labels.map((label, i) => (
        <div key={label} style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>
          <div style={{ height: 10, borderRadius: 5, background: colors[i], opacity: i === active ? 1 : 0.18 }} />
          <div style={{ fontWeight: i === active ? 700 : 400, marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function SourceItem({ s }) {
  return (
    <li style={{ marginBottom: 8 }}>
      <Badge category={s.category} />{' '}
      <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>{' '}
      <span className="muted">
        ({s.domain}{s.date ? ', ' + String(s.date).slice(0, 10) : ''})
      </span>
    </li>
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

export default function Home() {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState(null);
  const [audience, setAudience] = useState('teen');
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 8000);
    return () => clearInterval(t);
  }, [loading]);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(await compressImage(file));
  }

  const ready =
    (mode === 'text' && text.trim()) || (mode === 'link' && url.trim()) || (mode === 'photo' && image);

  async function check() {
    if (!ready) return;
    setLoading(true);
    setData(null);
    setCopied(false);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: mode === 'text' ? text : '',
          url: mode === 'link' ? url : '',
          image: mode === 'photo' ? image : null,
          audience,
          language,
        }),
      });
      setData(await res.json());
    } catch {
      setData({ error: 'Could not reach the server. Try again.' });
    }
    setLoading(false);
  }

  function copyReply() {
    navigator.clipboard.writeText(data.result.reply_draft);
    setCopied(true);
  }

  const r = data?.result;
  const total = data?.sources?.length || 0;
  const stats = data?.stats || {};
  const used = ORDER.filter((c) => stats[c]);
  const vIndex = r ? VERDICTS.indexOf(r.verdict) : -1;
  const vColor = vIndex >= 0 ? VERDICT_COLORS[vIndex] : '#9ca3af';

  return (
    <div className="ff">
      <style>{CSS}</style>
      <main className="wrap">
        <div className="brand">
          <div className="logo">F?</div>
          <h1>Fact or Feed?</h1>
        </div>
        <p className="tag">
          Saw something online? Send it here. We check 30+ sources across the spectrum and give you the real story.
        </p>

        <div className="card">
          <div className="tabs">
            <button className={`tab ${mode === 'text' ? 'on' : ''}`} onClick={() => setMode('text')}>✍️ Text</button>
            <button className={`tab ${mode === 'link' ? 'on' : ''}`} onClick={() => setMode('link')}>🔗 Link</button>
            <button className={`tab ${mode === 'photo' ? 'on' : ''}`} onClick={() => setMode('photo')}>📷 Photo</button>
          </div>

          {mode === 'text' && (
            <textarea
              className="field"
              rows={4}
              placeholder="Paste a post, message, or claim you saw…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}

          {mode === 'link' && (
            <input
              className="field"
              placeholder="Paste a news article link…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}

          {mode === 'photo' && (
            <label className="drop">
              {image ? (
                <img src={image} alt="Your upload" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10 }} />
              ) : (
                <span>Tap to upload a screenshot or photo</span>
              )}
              <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            </label>
          )}

          <div className="row">
            <select className="select" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="teen">I'm a teen</option>
              <option value="adult">I'm an adult</option>
            </select>
            <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="auto">Same language as post</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="ht">Kreyòl</option>
            </select>
            <button className="go" onClick={check} disabled={loading || !ready}>
              {loading ? 'Checking…' : 'Check it →'}
            </button>
          </div>
        </div>

        {loading && (
          <Card icon="🔎" title="Your agent is working">
            <ul className="steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
                  {i < step ? '✓ ' : i === step ? <span className="spin" /> : '○ '}
                  {s}
                </li>
              ))}
            </ul>
            <p className="muted" style={{ marginBottom: 0 }}>This usually takes about a minute.</p>
          </Card>
        )}

        {data?.error && <div className="card err">{data.error}</div>}

        {r && (
          <>
            {r.warning && <div className="card warn">⚠️ {r.warning}</div>}

            <div className="card" style={{ borderLeft: `6px solid ${vColor}` }}>
              <div className="label">Verdict</div>
              <div className="big" style={{ color: vColor }}>{r.verdict}</div>
              {vIndex >= 0 && <Meter labels={VERDICTS} colors={VERDICT_COLORS} active={vIndex} />}
              <h3 style={{ marginTop: 18 }}>📰 The Real Story</h3>
              <p style={{ marginTop: 0 }}>{r.real_story}</p>
              <p style={{ marginBottom: 0 }}>
                <span className="pill">Consensus: {r.consensus.level}</span>
                {r.consensus.explanation}
              </p>
            </div>

            {data.imageCheck && (
              <Card icon="🤖" title="Could this image be AI-made?">
                <Meter labels={AI_LEVELS} colors={AI_COLORS} active={AI_LEVELS.indexOf(data.imageCheck.level)} />
                {data.imageCheck.signs.length > 0 && (
                  <ul style={{ marginTop: 12 }}>
                    {data.imageCheck.signs.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
                <p className="muted" style={{ marginBottom: 0 }}>
                  {data.imageCheck.note} No tool can prove whether an image is AI-made, so treat this as a warning, not a final answer.
                </p>
              </Card>
            )}

            {total > 0 && (
              <Card icon="⚖️" title={`We checked ${total} sources`}>
                <div style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden' }}>
                  {used.map((c) => (
                    <div key={c} title={`${c}: ${stats[c]}`} style={{ width: `${(stats[c] / total) * 100}%`, background: COLORS[c] }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                  {used.map((c) => (
                    <span key={c}>
                      <Badge category={c} /> {stats[c]}
                    </span>
                  ))}
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>
                  Bias labels are approximate, based on published media bias ratings. "Not rated" means we don't have a rating for that site.
                </p>
              </Card>
            )}

            {r.right_and_wrong.length > 0 && (
              <Card icon="❌" title="What the post got wrong">
                {r.right_and_wrong.map((x, i) => (
                  <p key={i} style={{ margin: '0 0 10px' }}>
                    <b>Post says:</b> {x.post_says}
                    <br />
                    <b>Actually:</b> {x.actually}
                  </p>
                ))}
              </Card>
            )}

            {r.origin_timeline.length > 0 && (
              <Card icon="🕒" title="How this claim spread">
                <ol>
                  {r.origin_timeline.map((t, i) => (
                    <li key={i}>
                      <b>{t.when}:</b> {t.what}
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {r.disputed.length > 0 && (
              <Card icon="🤔" title="Sources disagree on">
                <ul>
                  {r.disputed.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Card>
            )}

            {r.unknown.length > 0 && (
              <Card icon="❓" title="Still unknown">
                <ul>
                  {r.unknown.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </Card>
            )}

            {r.persuasion_tactics.length > 0 && (
              <Card icon="🎣" title="How it tries to persuade you">
                <ul>
                  {r.persuasion_tactics.map((t, i) => (
                    <li key={i}>
                      <b>{t.tactic}</b> ({t.where}): {t.explanation}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card icon="🧠" title="How we figured this out">
              <ol>
                {r.how_we_figured_it_out.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </Card>

            <Card icon="💬" title="Send this back">
              <p className="reply">{r.reply_draft}</p>
              <button className="btn" onClick={copyReply}>{copied ? '✓ Copied!' : 'Copy reply'}</button>
            </Card>

            {data.trace && (
              <Card icon="⚙️" title="What the agent did">
                <ol>
                  {data.trace.timings.map((t, i) => (
                    <li key={i}>
                      {t.label} <span className="muted">({t.seconds}s)</span>
                    </li>
                  ))}
                </ol>
                <details style={{ marginTop: 10 }}>
                  <summary>Searches it ran</summary>
                  <ul>
                    {[...data.trace.queries.news, ...data.trace.queries.official, ...data.trace.queries.research].map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </details>
              </Card>
            )}

            {data.keySources?.length > 0 && (
              <Card icon="📚" title="Most important sources">
                <ul>
                  {data.keySources.map((s) => (
                    <SourceItem key={s.id} s={s} />
                  ))}
                </ul>
              </Card>
            )}

            {total > 0 && (
              <div className="card">
                <details>
                  <summary>
                    <b>See all {total} sources we read</b>
                  </summary>
                  <ul style={{ marginTop: 10 }}>
                    {data.sources.map((s) => (
                      <SourceItem key={s.id} s={s} />
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </>
        )}

        <p className="muted" style={{ textAlign: 'center', marginTop: 32 }}>
          Fact or Feed? uses AI and can make mistakes. Always check the sources.
        </p>
      </main>
    </div>
  );
}
