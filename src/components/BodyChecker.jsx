'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const BodyScene = dynamic(() => import('./BodyScene'), { ssr: false })

// ── Urgency config ─────────────────────────────────────────────────────────
const URGENCY_CONFIG = {
  low:      { label: 'Low',      color: '#22c55e', bg: '#052e16', icon: '🟢' },
  moderate: { label: 'Moderate', color: '#f59e0b', bg: '#1c1007', icon: '🟡' },
  high:     { label: 'High',     color: '#ef4444', bg: '#1c0505', icon: '🔴' },
}

// ── Mock analyzer — replace with real API call at the hackathon ────────────
const MOCK_RESPONSES = {
  'Head': {
    urgency: 'moderate',
    doctorAdvice: 'See a doctor if pain persists beyond 2 days or worsens',
    causes: ['Tension headache', 'Migraine', 'Dehydration', 'Sinus pressure'],
    summary: "Based on your description, you're likely experiencing a tension headache or migraine. This is very common and is often triggered by stress, dehydration, or prolonged screen time. Rest in a quiet, dark room, stay hydrated, and try over-the-counter pain relief.",
    nextSteps: ['Rest in a dark, quiet room', 'Drink at least 500ml of water', 'Try ibuprofen or acetaminophen', 'Apply a cold or warm compress to your forehead', 'See a doctor if this is the worst headache of your life'],
  },
  'Neck': {
    urgency: 'low',
    doctorAdvice: 'See a physiotherapist if it persists beyond 1 week',
    causes: ['Muscle strain from posture', 'Sleeping in a bad position', 'Tech neck from screen use'],
    summary: "Your neck pain is most likely muscular, often caused by poor posture or sleeping at an awkward angle. Gentle stretching and heat can help a lot. If you spend a lot of time at a desk, check your screen height.",
    nextSteps: ['Apply heat for 15–20 minutes', 'Do gentle neck stretches', 'Check your desk and screen ergonomics', 'Avoid looking down at your phone for long periods'],
  },
  default: {
    urgency: 'moderate',
    doctorAdvice: 'See a doctor within the next few days if pain does not improve',
    causes: ['Muscle strain or overuse', 'Minor inflammation', 'Poor posture or repetitive stress', 'Minor soft tissue injury'],
    summary: "Based on what you've described, this looks like a muscle strain or minor inflammation. This type of pain is very common and often resolves with rest, gentle movement, and over-the-counter anti-inflammatories. Avoid activities that aggravate the pain.",
    nextSteps: ['Rest the affected area for 24–48 hours', 'Apply ice for the first 48 hours, then switch to heat', 'Take ibuprofen if tolerated', 'Gentle stretching after the acute phase', 'See a doctor if pain worsens or does not improve in a week'],
  },
}

function mockAnalyze(region, type, duration, severity) {
  return new Promise((resolve) => {
    // Simulate a realistic API delay
    setTimeout(() => {
      const severityNum = parseInt(severity?.split('–')?.[0] ?? '5', 10)

      // Pull region-specific response or fall back to default
      const base = MOCK_RESPONSES[region] ?? MOCK_RESPONSES.default

      // Escalate urgency for high severity
      let urgency = base.urgency
      if (severityNum >= 9) urgency = 'high'
      else if (severityNum >= 7 && urgency === 'low') urgency = 'moderate'

      resolve({ ...base, urgency })
    }, 1600)
  })
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BodyChecker() {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedPoint,  setSelectedPoint]  = useState(null)
  const [step,    setStep]    = useState('idle')
  const [answers, setAnswers] = useState({ type: '', duration: '', severity: '' })
  const [result,  setResult]  = useState(null)

  const handleRegionClick = useCallback((region, point) => {
    setSelectedRegion(region)
    setSelectedPoint(point)
    setStep('questions')
    setAnswers({ type: '', duration: '', severity: '' })
    setResult(null)
  }, [])

  const handleSubmit = async () => {
    if (!answers.type || !answers.duration || !answers.severity) return
    setStep('loading')

    const data = await mockAnalyze(
      selectedRegion,
      answers.type,
      answers.duration,
      answers.severity,
    )
    setResult(data)
    setStep('result')
  }

  const handleReset = () => {
    setSelectedRegion(null)
    setSelectedPoint(null)
    setStep('idle')
    setResult(null)
  }

  const urgency = result ? (URGENCY_CONFIG[result.urgency] ?? URGENCY_CONFIG.low) : null

  return (
    <div style={styles.root} className="bc-root">
      {/* ── Left: 3D Model ── */}
      <div style={styles.canvasWrapper} className="bc-canvas">
        {/* Sci-fi dot-grid backdrop */}
        <div style={styles.dotGrid} />
        <div style={styles.canvasHint}>
          {step === 'idle'
            ? '◈ Touch body to scan  ·  Drag to orbit'
            : `◈ ${selectedRegion}`}
        </div>
        <BodyScene onRegionClick={handleRegionClick} selectedPoint={selectedPoint} />
      </div>

      {/* ── Right: Panel ── */}
      <div style={styles.panel} className="bc-panel">
        <h1 style={styles.logo}>
          BodyCheck <span style={{ color: '#00d0ff' }}>AI</span>
        </h1>
        <p style={styles.tagline}>Understand your pain. Know when to act.</p>

        {/* IDLE */}
        {step === 'idle' && (
          <div style={styles.card}>
            <p style={styles.instructions}>
              Click anywhere on the 3D body to select the area where you feel pain.
              Then answer a few quick questions and our AI will tell you what might be going on.
            </p>
            <div style={styles.featureList}>
              {[
                '🎯  Precise location targeting',
                '🤖  AI-powered symptom analysis',
                '🔊  Voice-guided results',
                '🏥  Doctor visit guidance',
              ].map(f => <div key={f} style={styles.feature}>{f}</div>)}
            </div>
          </div>
        )}

        {/* QUESTIONS */}
        {step === 'questions' && (
          <div style={styles.card}>
            <div style={styles.regionBadge}>📍 {selectedRegion}</div>
            <p style={styles.sectionTitle}>Tell us about your pain</p>

            <label style={styles.label}>Pain type</label>
            <div style={styles.optionGroup}>
              {['Sharp', 'Dull / Aching', 'Burning', 'Throbbing', 'Pressure'].map(opt => (
                <button
                  key={opt}
                  style={answers.type === opt ? { ...styles.optBtn, ...styles.optBtnActive } : styles.optBtn}
                  onClick={() => setAnswers(a => ({ ...a, type: opt }))}
                >{opt}</button>
              ))}
            </div>

            <label style={styles.label}>How long?</label>
            <div style={styles.optionGroup}>
              {['< 1 day', '1–3 days', '1 week', '2–4 weeks', '> 1 month'].map(opt => (
                <button
                  key={opt}
                  style={answers.duration === opt ? { ...styles.optBtn, ...styles.optBtnActive } : styles.optBtn}
                  onClick={() => setAnswers(a => ({ ...a, duration: opt }))}
                >{opt}</button>
              ))}
            </div>

            <label style={styles.label}>Severity (1 = mild, 10 = unbearable)</label>
            <div style={styles.optionGroup}>
              {['1–3', '4–6', '7–8', '9–10'].map(opt => (
                <button
                  key={opt}
                  style={answers.severity === opt ? { ...styles.optBtn, ...styles.optBtnActive } : styles.optBtn}
                  onClick={() => setAnswers(a => ({ ...a, severity: opt }))}
                >{opt}</button>
              ))}
            </div>

            <button
              style={{
                ...styles.submitBtn,
                ...(!answers.type || !answers.duration || !answers.severity
                  ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
              }}
              onClick={handleSubmit}
              disabled={!answers.type || !answers.duration || !answers.severity}
            >
              Analyze my pain →
            </button>
          </div>
        )}

        {/* LOADING */}
        {step === 'loading' && (
          <div style={{ ...styles.card, textAlign: 'center', padding: '40px 20px' }}>
            <div style={styles.spinner} />
            <p style={{ color: '#94a3b8', marginTop: 16 }}>Analyzing your symptoms…</p>
          </div>
        )}

        {/* RESULT */}
        {step === 'result' && result && (
          <div style={styles.card}>
            <div style={styles.regionBadge}>📍 {selectedRegion}</div>

            {/* Urgency bar */}
            <div style={{ ...styles.urgencyBar, background: urgency.bg }}>
              <span style={{ fontSize: 22 }}>{urgency.icon}</span>
              <div>
                <div style={{ color: urgency.color, fontWeight: 700, fontSize: 15 }}>
                  {urgency.label} urgency
                </div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{result.doctorAdvice}</div>
              </div>
            </div>

            {/* Possible causes */}
            <p style={styles.sectionTitle}>Possible causes</p>
            <ul style={styles.causeList}>
              {result.causes?.map((c, i) => (
                <li key={i} style={styles.causeItem}>
                  <span style={{ color: '#00d0ff', marginRight: 8 }}>•</span>{c}
                </li>
              ))}
            </ul>

            {/* Summary */}
            <div style={styles.summaryBox}>
              <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.6, fontSize: 13 }}>
                {result.summary}
              </p>
            </div>

            {/* Next steps */}
            <p style={styles.sectionTitle}>What to do next</p>
            <ul style={styles.causeList}>
              {result.nextSteps?.map((s, i) => (
                <li key={i} style={styles.causeItem}>
                  <span style={{ color: '#34d399', marginRight: 8 }}>✓</span>{s}
                </li>
              ))}
            </ul>

            <div style={styles.disclaimer}>
              ⚠️ This is not medical advice. Always consult a healthcare professional.
            </div>

            <button style={styles.resetBtn} onClick={handleReset}>
              ← Check another area
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles — sci-fi holographic theme ──────────────────────────────────────
const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    background: '#040d1a',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
  },
  canvasWrapper: {
    flex: '1 1 55%',
    position: 'relative',
    background: 'radial-gradient(ellipse at 50% 38%, #091628 0%, #040d1a 68%)',
  },
  // Dot-grid backdrop rendered behind the WebGL canvas
  dotGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(circle, rgba(0,180,255,0.10) 1px, transparent 1px)',
    backgroundSize: '42px 42px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  canvasHint: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    background: 'rgba(2,14,30,0.88)',
    border: '1px solid rgba(0,208,255,0.35)',
    borderRadius: 20,
    padding: '7px 18px',
    color: '#00d0ff',
    fontSize: 12,
    letterSpacing: '0.04em',
    backdropFilter: 'blur(8px)',
    whiteSpace: 'nowrap',
  },
  panel: {
    flex: '0 0 420px',
    overflowY: 'auto',
    padding: '28px 24px',
    background: '#060e1e',
    borderLeft: '1px solid rgba(0,180,255,0.08)',
  },
  logo: {
    fontSize: 26,
    fontWeight: 800,
    color: '#e0f4ff',
    margin: '0 0 4px',
    letterSpacing: '-0.5px',
  },
  tagline: {
    color: '#3a6a88',
    fontSize: 13,
    margin: '0 0 20px',
  },
  card: {
    background: '#0b1828',
    borderRadius: 12,
    padding: '20px',
    border: '1px solid rgba(0,160,220,0.12)',
  },
  instructions: {
    color: '#5a90b0',
    fontSize: 14,
    lineHeight: 1.6,
    margin: '0 0 16px',
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: 8 },
  feature: {
    color: '#a0cce0',
    fontSize: 13,
    padding: '8px 12px',
    background: 'rgba(0,160,220,0.06)',
    borderRadius: 8,
    border: '1px solid rgba(0,160,220,0.08)',
  },
  regionBadge: {
    display: 'inline-block',
    background: 'rgba(0,208,255,0.12)',
    color: '#00d0ff',
    border: '1px solid rgba(0,208,255,0.3)',
    borderRadius: 20,
    padding: '4px 14px',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 14,
    letterSpacing: '0.03em',
  },
  sectionTitle: {
    color: '#d0eeff',
    fontWeight: 600,
    fontSize: 14,
    margin: '14px 0 8px',
  },
  label: {
    display: 'block',
    color: '#4a7a9a',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  optionGroup: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  optBtn: {
    padding: '6px 12px',
    fontSize: 12,
    border: '1px solid rgba(0,160,220,0.18)',
    borderRadius: 8,
    background: 'rgba(0,100,160,0.08)',
    color: '#5a90b0',
    cursor: 'pointer',
  },
  optBtnActive: {
    background: 'rgba(0,208,255,0.15)',
    border: '1px solid #00d0ff',
    color: '#00d0ff',
  },
  submitBtn: {
    width: '100%',
    marginTop: 18,
    padding: '12px',
    background: 'linear-gradient(135deg, #0055cc 0%, #00aaff 100%)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    letterSpacing: '0.03em',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid rgba(0,180,255,0.12)',
    borderTop: '3px solid #00d0ff',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 0.8s linear infinite',
  },
  urgencyBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 10,
    marginBottom: 4,
  },
  causeList: { listStyle: 'none', padding: 0, margin: '0 0 4px' },
  causeItem: {
    color: '#a0cce0',
    fontSize: 13,
    padding: '5px 0',
    borderBottom: '1px solid rgba(0,160,220,0.06)',
    display: 'flex',
    alignItems: 'flex-start',
  },
  summaryBox: {
    background: 'rgba(0,100,160,0.08)',
    border: '1px solid rgba(0,160,220,0.1)',
    borderRadius: 10,
    padding: '12px 14px',
    margin: '12px 0',
  },
  disclaimer: {
    color: '#2a4a60',
    fontSize: 11,
    margin: '12px 0',
    lineHeight: 1.5,
  },
  resetBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    color: '#00d0ff',
    fontWeight: 600,
    fontSize: 13,
    border: '1px solid rgba(0,208,255,0.3)',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: '0.03em',
  },
}
