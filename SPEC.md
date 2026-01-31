# SPEC — Whisper Lite (ElleHacks 2026)

## 1) Product summary

**Name**: Whisper Lite  
**Pillar / Theme**: Accessibility  
**Mission**: Give agency back to neurodivergent teens who are overlooked in a world designed for neurotypicals.  
**One-liner**: *“Whisper Lite is like having an emotionally intelligent friend in your pocket—one who translates the chaos of high school into something you can actually handle.”*  
**Core value prop**: Quiet courage, powered by AI. **Not a fix—a companion.**

### What Whisper Lite is
A **mobile web app** that listens to short classroom audio (live/prototype), detects potential stressors (tone, pace, sudden laughter, sarcasm cues), and delivers **private, calming interventions** (haptic + gentle copy + calming UI shifts). It also creates **post-class recaps** at a personalized reading level, and a **weekly dashboard** that shows patterns without judgment.

### What Whisper Lite is not
- A surveillance tool (no camera, no biometric tracking, no “scoring” students).
- A diagnosis or therapy replacement.
- A “teacher policing” tool (teacher features are optional/stretch and privacy-bounded).

## 2) Target users & context

### Primary users
- **Neurodivergent high school students (ages 13–19)** in mainstream Canadian classrooms (Toronto focus).
- Examples: autism, ADHD, dyslexia (and overlapping sensory/anxiety needs).

### Secondary / trusted adults (optional)
- Parent/guardian, counselor, or other trusted adult for **one-tap support** (safe-word message).

### Key constraints (design drivers)
- **Invisible by default**: must not draw attention or stigma.
- **Low cognitive load**: minimal choices while in class; no clutter.
- **Non-judgmental tone**: no “failure states,” no shame language.
- **Ethical AI**: audio-only analysis; minimize retention; explicit consent.

## 3) The “hook” (what makes this stand out)

**Proactive, invisible emotional support**:
- **Proactive, not reactive**: detects stress cues before overwhelm peaks.
- **Invisible support**: private interventions (haptics + subtle UI), no audible output required.
- **Social translator**: interprets tone/pace/sarcasm and reframes ambiguity into safety.
- **Independence-building**: helps users stay in class and self-regulate without being pulled out.
- **Ethical AI stance**: audio-only processing, transparency, and minimal data retention.

## 4) Primary user experience (UX)

### Core screens
1. **Home / Ready**
   - Background: soft deep green (calming, dark-mode friendly).
   - Primary CTA: **Start Listening** (large, high-contrast, gently pulsing).
   - Small supportive line: “You’re safe. Breathe.”
   - Quick last-session nugget: “Last session: 2h ago • 4 min calm”

2. **Active Listening (in class)**
   - Screen auto-dims; minimal UI.
   - Subtle waveform/pulse indicates “listening” without being flashy.
   - If a stressor is detected:
     - **One gentle vibration** (single pulse, not repeated).
     - A soft ripple animation.
     - One calming prompt (short, kind, human).
     - Optional: “Did that affect you?” prompt appears only *after* the moment passes.

3. **Recap (after class)**
   - Title: “You were here today”
   - Summary: 3–7 short sentences, friendly, supportive.
   - Adjustable reading level (Grade 6–10).
   - Optional: audio playback (calm voice).
   - Actions: Save to journal, mark helpful, share with trusted adult (optional).

4. **Weekly Dashboard**
   - Patterns + progress (gentle reflection):
     - “You feel calmer on Tuesdays.”
     - “4 calm sessions this week.”
   - No leaderboards, no competitive framing.

### Interaction design: making the main dashboard feel “present”
To avoid a passive “mic + waves” experience, the Active screen uses:
- **Touch to Breathe**: press-and-hold the center pulse to start a guided pattern (e.g., inhale 4s, exhale 6s) with subtle haptics.
- **Color shifts with tone**: calm → green; stressor detected → amber (avoid red).
- **Micro-animations**: leaf drift when calm; small shield icon when a trigger is detected (subtle, not distracting).
- **Post-event check-in** (optional): “That got loud. Want to pause and breathe?” → Yes / No / Not now.

## 5) Functional requirements (prioritized)

### Must-have (demo-critical)

#### A) Real-time (or simulated-real-time) audio analysis
- **Input**: user records audio (e.g., 10–30 seconds) or streams live (hackathon can simulate via short clips).
- **Outputs**:
  - Teacher tone category (e.g., calm / urgent / frustrated / unknown).
  - Stressor flags (fast speech, sudden laughter spike, loudness shift, sarcasm-likely cue).
  - Confidence + “why” explanation in plain language (internal + optionally user-facing).
- **Notes**:
  - For hackathon reliability: support “upload clip → analyze → return” flow first.

#### B) Silent interventions (no stigma)
- **Haptic pulse**: single gentle vibration when stressor detected.
- **Calming prompt**: short, kind message (e.g., “You’re safe. This isn’t about you.”).
- **Adaptive UI**: background shifts subtly (green ↔ amber) to signal state without alarm.

#### C) Post-class recap
- Generates a summary (text) from transcript or provided text.
- Personalized reading level (Grade 6–10).
- Optional audio playback voice (calm, friendly).
- Example:
  - “Today: Photosynthesis. Plants eat sunlight. They make oxygen. You followed along for 12 min. Proud of you.”

#### D) Weekly dashboard (progress + pattern tracking)
- Tracks sessions and outcomes:
  - calm moments count
  - triggers encountered
  - coping actions used (breathe, journal, saved recap)
- Pattern insights (non-judgmental):
  - “Group work days tend to feel louder.”
  - “You use breathing more during science.”

### Nice-to-have (if time allows)

#### E) Trusted adult alert (“safe word”)
- One-tap button sends pre-written message:
  - “I’m feeling overwhelmed. Can I take a break?”
- Delivery methods (choose one for hackathon):
  - SMS (e.g., Twilio) or
  - Push notification (PWA push) or
  - Email fallback

#### F) Gentle gamification (not competitive)
- Earn “Focus Moments” for using coping tools (breathing, journaling, recap review).
- Unlock journal prompts after stressful classes.
- **No leaderboards**.

#### G) Context clue library (“emotional Duolingo”)
- Searchable phrases + interpretations:
  - “We’ll talk later” → “They may be busy, not mad.”
- Tie-in: surfaces suggested clues when stressor + phrase detected.

#### H) Sponsor products (hackathon-friendly placeholder)
- A curated “Support tools” list (earplugs, fidgets, planners) with accessibility-safe UI.
- Clearly labeled as optional; never interrupts core flow.

### Out-of-scope (for Whisper Lite demo)
- Wearable hardware (ring/earpiece) integration.
- Continuous background recording without user action.
- Facial expression analysis / camera use.
- Medical claims or diagnoses.

## 6) AI behavior & ethics

### “Stress detection” approach (no wearables)
Whisper Lite detects emotional stress cues from **audio patterns** plus a lightweight “meaning” layer:
- **Voice tone analysis** (teacher/peer): urgency, frustration, excitement; fast speech; pitch/energy changes.
- **Environmental triggers**: sudden laughter spikes; overlapping voices (“crowd noise”); rapid pace changes.
- **Context layer (LLM)**: interprets phrases that can be emotionally loaded (“we’ll talk later”, “you’re wrong”).
- **User feedback loop**: after session, ask “Did that moment feel stressful?” to personalize sensitivity.

### Privacy principles (must be explicit in-app)
- **Consent first**: clear “Start Listening” + explain what is analyzed.
- **Minimize retention**:
  - Prefer storing transcript + derived features over raw audio.
  - Allow “Delete session” and “Clear history.”
- **No camera**. No biometrics. No location tracking.
- **Transparency**: show what the system thinks it detected, and allow “Not accurate” feedback.

### Safety constraints (copy + UX)
- Never escalate panic (“ALERT”, flashing red, sirens).
- If user reports severe distress, provide grounding steps and suggest contacting trusted adult (no clinical language).

## 7) Tech stack (hackathon-lean)

### Frontend
- **Vite + React** (mobile-first UI)
- **TypeScript** (recommended)
- **PWA support** (optional): add-to-home-screen, vibration API, offline shell
- UI styling (choose one):
  - Tailwind CSS (fast) or
  - CSS modules (simpler)

### Backend
- **Node.js + Express**
- API routes for analyze/recap/profile/dashboard

### AI / Audio services
- **ElevenLabs**: voice emotion/tone detection and/or voice synthesis for recap playback (depending on available endpoints/plan).
- **OpenAI or Hugging Face**:
  - transcript summarization into supportive recap
  - reading-level control
  - optional “context clue” generation

### Data
- **MongoDB Atlas** (free tier)
  - users, sessions, recaps, triggers, preferences

### Deployment
- **DigitalOcean App Platform** (or equivalent)

### Device capabilities (web)
- **Web Audio / MediaRecorder**: record short clips in-browser.
- **Vibration API**: haptic pulse on supported devices (Android supported broadly; iOS may be limited—provide graceful fallback).

## 8) Data model (proposed)

### `users`
- `_id`
- `displayName`
- `ageRange` (e.g., `13-15`, `16-19`)
- `pronouns` (optional)
- `readingLevelGrade` (6–10)
- `sensitivity` (low/med/high)
- `trustedAdult` (optional):
  - `name`
  - `channel` (`sms` | `email` | `push`)
  - `address` (phone/email/token)
- `createdAt`, `updatedAt`

### `sessions`
- `_id`
- `userId`
- `startedAt`, `endedAt`
- `audio` (prefer metadata only):
  - `durationSec`
  - `storageRef` (optional; omit if not storing audio)
- `transcript` (string, optional)
- `detections`:
  - `overallState` (`calm` | `stressor_detected` | `unknown`)
  - `events`: array of
    - `t` (timestamp or segment index)
    - `type` (`fast_speech` | `laughter_spike` | `harsh_tone` | `sarcasm_likely` | `crowd_noise`)
    - `confidence` (0–1)
    - `note` (plain explanation)
- `interventionsUsed`:
  - `hapticSent` (boolean)
  - `breatheUsed` (boolean)
  - `journalUsed` (boolean)
- `userFeedback` (optional):
  - `feltStressful` (yes/no/not_sure)
  - `notes`

### `recaps`
- `_id`
- `sessionId`
- `userId`
- `readingLevelGrade`
- `summaryText`
- `keyTerms` (array of `{ term, explanation }`)
- `audioUrl` (optional)

### `contextClues` (optional)
- `_id`
- `phrase`
- `meaning`
- `examples` (optional)

## 9) API surface (proposed)

### `POST /api/analyze`
**Purpose**: accept audio clip + user preferences, return detected stressors and suggested intervention text.  
**Request**:
- `userId`
- `audio` (multipart upload) OR `audioBase64` (prototype)
- optional `transcript` (if client provides)
**Response**:
- `detections` (events + overall)
- `suggestedPrompt` (calming message)
- `uiState` (`green` | `amber`)

### `POST /api/recap`
**Purpose**: generate recap from transcript (or audio-derived transcript) + reading level.  
**Request**:
- `userId`
- `sessionId`
- `transcript` (preferred for hackathon reliability)
- `readingLevelGrade`
**Response**:
- `summaryText`
- optional `audioUrl`

### `GET /api/dashboard/weekly?userId=...`
**Purpose**: weekly stats + pattern insights.  
**Response**:
- session counts, calm moments, triggers, top triggers
- pattern insights (strings)

### `POST /api/profile`
Create/update user preferences (reading level, sensitivity, trusted adult).

### `POST /api/alert` (optional)
Send safe-word message to trusted adult.

## 10) Feature details (implementation notes)

### Calming prompt library (example)
- “You’re safe. This isn’t about you.”
- “Breathe with me. In… out…”
- “It’s okay to pause. You’re doing your best.”
- “Confusing moments happen. You’re not in trouble.”

Rules:
- Keep under ~80 characters for in-class display.
- Avoid clinical language and avoid “diagnosing” (“anxiety attack”, etc.).

### Reading level control (recaps)
Prompt must enforce:
- short sentences
- friendly supportive tone
- define hard words
- avoid sarcasm/jokes
- include 1 gentle encouragement line

### Accessibility requirements (non-negotiable)
- **Contrast**: WCAG AA minimum for text + controls.
- **Typography**: readable sizes; avoid thin weights; generous line-height.
- **Motion**: animations subtle and optional; respect reduced motion.
- **Sound**: no required audio output in class; captions/transcripts for audio playback.
- **Focus states**: clear keyboard focus outlines.
- **Language**: plain-language mode; no jargon.

## 11) Demo flow (what to show judges)

### Demo script (2–3 minutes)
1. Home: “Start Listening” (explain invisibility + consent).
2. Record/upload a sample “classroom moment” clip.
3. Show analysis result:
   - “Teacher tone: urgent”
   - “Stressor: fast speech + sudden laughter (not directed at you)”
4. Show silent intervention:
   - single haptic pulse (or simulated)
   - prompt: “You’re safe. This isn’t about you.”
   - UI shifts amber gently
5. Post-class recap at Grade 7 reading level + optional audio playback.
6. Weekly dashboard insight: “You feel calmer on Tuesdays.”
7. (Optional) safe-word button sending a prewritten message.

## 12) Hackathon build scope (recommended MVP)

### MVP (finish no matter what)
- Record/upload clip
- Analyze (mock or real) → return stressor + prompt + UI state
- Generate recap from transcript
- Store sessions/recaps
- Weekly dashboard summary from stored sessions

### Stretch goals (only if MVP is stable)
- Trusted adult alert
- Context clue library
- Gentle gamification
- PWA install + push notifications

## 13) Open questions / decisions (for the team)

These do not block writing code, but should be decided early:
- **Audio pipeline**: will we generate transcript client-side, server-side, or accept typed transcript for demo reliability?
- **ElevenLabs usage**: emotion detection vs voice synthesis (or both). If detection is unavailable/limited, use heuristic audio features + LLM classification.
- **Device haptics**: if vibration API unsupported, what’s the fallback (visual pulse only).
- **Trusted adult channel**: SMS vs email vs push for the hackathon.

