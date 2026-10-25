'use client';
import { useState, useEffect } from 'react';

const STEPS = [
  'Reading what you sent…',
  'Finding the claims…',
  'Spotting persuasion tactics…',
  'Checking news sources…',
  'Writing the real story…',
];

export default function Home() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState(null);
  const [audience, setAudience] = useState('teen');
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    return () => clearInterval(t);
  }, [loading]);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  async function check() {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url, image, audience, language }),
      });
      setData(await res.json());
    } catch {
      setData({ error: 'Could not reach the server. Try again.' });
    }
    setLoading(false);
  }

  const r = data?.result;
  const box = {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      <h1 style={{ marginBottom: 4 }}>Fact or Feed?</h1>
      <p style={{ marginTop: 0, color: '#555' }}>Send it anything you saw. Get the real story.</p>

      <div style={box}>
        <textarea
          placeholder="Paste a post, message, or claim"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', padding: 8, fontSize: 16 }}
        />
        <input
          placeholder="Or paste an article link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: 8, marginTop: 8, fontSize: 16 }}
        />
        <div style={{ marginTop: 8 }}>
          <label>
            Or add a screenshot: <input type="file" accept="image/*" onChange={onFile} />
          </label>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={{ padding: 8 }}>
            <option value="teen">I'm a teen</option>
            <option value="adult">I'm an adult</option>
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: 8 }}>
            <option value="auto">Same language as post</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ht">Kreyòl</option>
          </select>
          <button
            onClick={check}
            disabled={loading}
            style={{ padding: '8px 20px', fontSize: 16, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            {loading ? 'Checking…' : 'Check it'}
          </button>
        </div>
      </div>

      {loading && <div style={box}>{STEPS[step]}</div>}
      {data?.error && <div style={{ ...box, color: '#b00020' }}>{data.error}</div>}

      {r && (
        <>
          {r.warning && <div style={{ ...box, background: '#fff3cd' }}>⚠️ {r.warning}</div>}

          <div style={box}>
            <div style={{ fontSize: 14, color: '#555' }}>Verdict</div>
            <h2 style={{ margin: '4px 0 12px' }}>{r.verdict}</h2>
            <h3 style={{ marginBottom: 4 }}>The Real Story</h3>
            <p style={{ marginTop: 0 }}>{r.real_story}</p>
          </div>

          {r.right_and_wrong.length > 0 && (
            <div style={box}>
              <h3 style={{ marginTop: 0 }}>What the post got wrong</h3>
              {r.right_and_wrong.map((x, i) => (
                <p key={i}>
                  <b>Post says:</b> {x.post_says}
                  <br />
                  <b>Actually:</b> {x.actually}
                </p>
              ))}
            </div>
          )}

          {r.disputed.length > 0 && (
            <div style={box}>
              <h3 style={{ marginTop: 0 }}>Sources disagree on</h3>
              <ul>{r.disputed.map((d, i) => <li
