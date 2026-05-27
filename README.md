# BodyCheck AI — Internal Team Docs

> **Private — hackathon team use only.**  
> Cursor × Toronto Tech Week · BrainStation · May 27 2026  
> Target: **Track 2 — Best ElevenLabs Project** ($990/member) · also competitive for Track 1 (Best Overall)

---

## What It Does

Users tap/click a rotating 3D human body model to mark where they hurt. They answer three quick questions (pain type, duration, severity) and get back an AI-generated triage card: urgency level (low / moderate / high), possible causes, a plain-English summary, and recommended next steps. The result is optionally read aloud via ElevenLabs TTS.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| 3D | React Three Fiber v9 + Drei v10 + Three.js v0.182 |
| AI analysis | Claude API — `claude-haiku-4-5-20251001` |
| Voice output | ElevenLabs TTS (Rachel, voice ID `21m00Tcm4TlvDq8ikWAM`) |
| Deployment | Vercel |

---

## Quick Start

```bash
# 1 — install
cd bodycheck-ai
npm install

# 2 — add API keys (see Environment Variables section below)
cp .env.local.example .env.local   # or create it manually

# 3 — run
npm run dev        # → http://localhost:3000
```

No API keys are required to run locally — the app ships with mock data that mimics real responses.

---

## Repo Structure

```
bodycheck-ai/
├── public/
│   └── human_body.glb          ← single-mesh GLB; ONE mesh: nodes.Object_4
│                                  material key: "Material.001"
├── src/
│   ├── app/
│   │   ├── globals.css          ← resets, spin keyframe, nothing else
│   │   ├── layout.js            ← Geist font wiring + metadata (⚠ update title)
│   │   └── page.js              ← dynamic import of BodyChecker (ssr: false)
│   │
│   └── components/
│       ├── HumanBodyModel.jsx   ← GLB loader · click → region · pain dot marker
│       ├── BodyScene.jsx        ← R3F <Canvas> · lighting · OrbitControls
│       └── BodyChecker.jsx      ← all app state · questions UI · results card
│
├── .env.local                   ← NOT committed — holds real API keys
├── .gitignore
├── CLAUDE.md                    ← Claude Code agent handoff notes
├── next.config.mjs
├── jsconfig.json
└── package.json
```

---

## Architecture

```
page.js
  └─ (dynamic, no SSR)
     └─ BodyChecker.jsx          ← owns all state: step, region, point, answers, result
           ├─ BodyScene.jsx       ← R3F Canvas wrapper
           │    └─ HumanBodyModel.jsx  ← mesh + click handler + pain dot
           └─ UI panels           ← idle / questions / loading / result (inline JSX)
```

### Data flow
1. User clicks 3D mesh → `HumanBodyModel` fires `onRegionClick(region, point3D)`
2. `BodyChecker` saves region + 3D point → sets `step = 'questions'`
3. User fills in pain type / duration / severity → clicks **Analyze**
4. `handleSubmit` calls `mockAnalyze(...)` (or real `/api/analyze` once wired)
5. Response sets `result` → `step = 'result'`
6. Result card renders; `speakText()` fires ElevenLabs TTS

---

## 3D Model Notes

- **Single mesh.** The GLB contains exactly one renderable mesh at `nodes.Object_4`. There are no named body-part sub-meshes — highlighting is done via a marker sphere, not per-mesh colour.
- **Region mapping** lives in `getBodyRegion(point)` in `HumanBodyModel.jsx`. It uses the click point's world-space `y` and `x` after Drei's `<Center>` auto-centering and the mesh's `rotation={[Math.PI/2, 0, 0]}` + `scale={2.113}`. Effective range is approximately `y ∈ [-1.7, 1.7]`.

```
y > 1.35   → Head
y > 1.05   → Neck
y > 0.70   → [Left|Right] Shoulder
y > 0.25   → [Left|Right] Chest / Upper Back
y > -0.15  → [Left|Right] Abdomen
y > -0.55  → [Left|Right] Lower Back / Hip
y > -1.05  → [Left|Right] Thigh
y > -1.45  → [Left|Right] Knee / Shin
else       → [Left|Right] Ankle / Foot
```

> **If the model file is ever replaced,** re-calibrate these Y thresholds — they are baked to this specific GLB's proportions.

- **OrbitControls** — drag to orbit, scroll to zoom. Pan is disabled. Polar angle clamped to `[π/6, 5π/6]` (can't flip upside-down). Distance clamped `[3, 9]`.

---

## Current State

### ✅ Done
- 3D body renders, auto-rotates, drag-orbits on mouse and touch
- Click registers a 3D world point + maps it to a named body region
- Animated pain marker at click location (pulsing rings + glowing core)
- Question panel: pain type · duration · severity pill buttons
- Loading state with spinner
- Results card: urgency bar, causes list, AI summary, next-step checklist
- "Check another area" reset flow
- ElevenLabs `speakText()` stub wired — silently no-ops without a key

### 🔴 Must do before demo
These are the only things between you and a live demo:

1. **Get API keys** at check-in and drop them in `.env.local`
2. **Add the API route** (one file — see below)
3. **Swap the mock call** (two lines — see below)
4. **Test voice** end-to-end before going on stage
5. **Deploy** `npx vercel --prod`

### 🟡 Nice to have if time allows
- Voice input via Web Speech API (`webkitSpeechRecognition`) for hands-free answer entry
- Front / back toggle button (flip model `rotation.y += Math.PI`)
- Mobile-first responsive layout (currently side-by-side, collapses awkwardly on small screens)
- Real per-region mock data beyond Head / Neck (currently falls through to `default` response)

---

## Wiring Up the Real API

### Step 1 — Create the API route

Create **`src/app/api/analyze/route.js`** (new file, doesn't exist yet):

```js
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const { region, type, duration, severity } = await request.json()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content:
          `You are a medical triage assistant. ` +
          `Body region: ${region}. Pain type: ${type}. ` +
          `Duration: ${duration}. Severity: ${severity}/10. ` +
          `Respond ONLY with JSON: ` +
          `{ "urgency": "low"|"moderate"|"high", "doctorAdvice": "...", ` +
          `"causes": ["...","...","..."], "summary": "...", "nextSteps": ["...","...","..."] }`,
      },
    ],
  })

  const raw = message.content[0].text
    .replace(/^```json?\n?/, '')
    .replace(/\n?```$/, '')

  const result = JSON.parse(raw)
  return Response.json(result)
}
```

> You'll also need to `npm install @anthropic-ai/sdk` if the SDK isn't in `package.json` yet.

### Step 2 — Swap the mock in BodyChecker.jsx

In `handleSubmit`, find this line:

```js
const data = await mockAnalyze(selectedRegion, answers.type, answers.duration, answers.severity)
```

Replace it with:

```js
const res = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ region: selectedRegion, ...answers }),
})
const data = await res.json()
```

That's it. The result shape is identical so nothing else needs to change.

---

## Environment Variables

Create `.env.local` in the project root (never commit this file):

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_ELEVENLABS_API_KEY=sk_...
```

| Variable | Where to get it | Used in |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | `src/app/api/analyze/route.js` (server-side only) |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | elevenlabs.io/app/settings | `BodyChecker.jsx` → `speakText()` (client-side, prefixed `NEXT_PUBLIC_`) |

> `NEXT_PUBLIC_` prefix exposes the variable to the browser bundle. That's intentional for ElevenLabs since the TTS call fires from the client. The Anthropic key is server-only and must NOT be prefixed.

---

## ElevenLabs TTS

The `speakText(text, apiKey)` function in `BodyChecker.jsx` calls the ElevenLabs streaming API. It's already hooked to fire after a result loads — it just silently skips when the key is missing.

- **Voice:** Rachel — ID `21m00Tcm4TlvDq8ikWAM`
- **Model:** `eleven_monolingual_v1`
- **What it reads:** the `result.summary` string

To test manually before the demo:
```js
speakText("Your pain looks like a tension headache.", "sk_YOUR_KEY_HERE")
```

---

## Deployment

```bash
# one-time setup
npm i -g vercel

# deploy to production
npx vercel --prod
```

Set environment variables in the Vercel dashboard under **Project → Settings → Environment Variables** — do not rely on `.env.local` for production.

---

## Known Gotchas

| # | Issue | Fix |
|---|---|---|
| 1 | `layout.js` still has default title `"3D Glass"` from create-next-app | Update `metadata.title` and `metadata.description` in `src/app/layout.js` |
| 2 | Region Y thresholds are calibrated to this specific GLB | If the model file changes, re-test and update `getBodyRegion()` in `HumanBodyModel.jsx` |
| 3 | GLB is a single mesh — no per-part colour highlighting | Marker dot is the only visual feedback for selection; this is intentional for now |
| 4 | `@anthropic-ai/sdk` is not in `package.json` yet | Run `npm install @anthropic-ai/sdk` before adding the API route |
| 5 | Canvas click and orbit can conflict on mobile | Tap = click registers fine; drag = orbit. Short tap < 200ms fires click, longer = orbit |

---

## Useful References

- [React Three Fiber docs](https://docs.pmnd.rs/react-three-fiber)
- [Drei helpers](https://github.com/pmndrs/drei)
- [Three.js MeshStandardMaterial](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial)
- [ElevenLabs TTS REST API](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages)
- [Vercel environment variables](https://vercel.com/docs/projects/environment-variables)
