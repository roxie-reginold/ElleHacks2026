# Whisper Lite

**Quiet courage, powered by AI. Not a fix—a companion.**

Whisper Lite is a mobile web app designed to support neurodivergent high school students in mainstream classrooms. It listens to classroom audio, detects potential stressors, and delivers private, calming interventions.

## Features

- **Real-time Audio Analysis**: Detects tone, pace, and emotional cues in classroom audio
- **Silent Interventions**: Haptic feedback and calming prompts without drawing attention
- **Post-class Recaps**: Summaries at adjustable reading levels (Grade 6-10)
- **Weekly Dashboard**: Pattern tracking without judgment
- **Trusted Adult Alerts**: One-tap support messages (optional)
- **Accessibility First**: WCAG AA compliant, reduced motion support

## Tech Stack

### Frontend
- Vite + React + TypeScript
- Tailwind CSS
- Framer Motion (animations)
- PWA support

### Backend
- Node.js + Express + TypeScript
- MongoDB Atlas (optional)
- OpenAI API (Whisper + GPT-4)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd ElleHacks2026
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

4. Set up environment variables:
```bash
# Copy the example and fill in your values
cp .env.example .env
```

### Running the App

**Both servers must be running** for Quick Help and the teacher dashboard to work.

1. Start the backend server (default port 3001):
```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```

3. Open http://localhost:5173 in your browser. The frontend uses `VITE_API_URL` (see `frontend/.env`) to talk to the backend; if you see "Failed to load help requests" or "Couldn't send", ensure the backend is running and `frontend/.env` has `VITE_API_URL=http://localhost:3001`.

### Environment Variables

**Backend** (in project root `.env` or `backend/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend port (default: 3001) |
| `MONGODB_URI` or `MONGO_URI` | No | MongoDB connection string (works without) |
| `OPENAI_API_KEY` | No | For audio transcription and analysis |
| `ELEVENLABS_API_KEY` | No | For voice synthesis |
| `TWILIO_ACCOUNT_SID` | No | For SMS alerts |
| `TWILIO_AUTH_TOKEN` | No | For SMS alerts |
| `TWILIO_PHONE_NUMBER` | No | For SMS alerts |

**Frontend** (in `frontend/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes for help/teacher features | Backend URL, e.g. `http://localhost:3001` |

**Note**: The app works in demo mode without API keys. Quick Help and teacher dashboard need the backend running and `VITE_API_URL` set so the frontend can reach it.

## Project Structure

```
ElleHacks2026/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client
│   │   └── context/       # React context
│   └── public/            # Static assets
├── backend/               # Express backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   └── models/        # MongoDB schemas
├── .env                   # Environment variables
└── SPEC.md               # Full specification
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze audio for stress detection |
| `/api/recap` | POST | Generate recap from transcript |
| `/api/dashboard/weekly` | GET | Get weekly stats and insights |
| `/api/profile` | POST | Create/update user profile |
| `/api/profile/:userId` | GET | Get user profile |
| `/api/alert` | POST | Send alert to trusted adult |

## Demo Flow

1. **Home Screen**: Tap "Start Listening"
2. **Record/Upload**: Capture classroom audio
3. **Analysis**: View detected tones and stressors
4. **Intervention**: Receive haptic + calming prompt if needed
5. **Recap**: Review class summary at your reading level
6. **Dashboard**: Track patterns over time

## Privacy & Ethics

- **No surveillance**: Audio-only, no camera or biometrics
- **Minimal retention**: Prefer transcripts over raw audio
- **User control**: Delete history and data anytime
- **Transparent**: Shows what was detected and why
- **Not a diagnosis**: Support tool, not medical advice

## Accessibility

- WCAG AA contrast ratios
- Clear focus states
- Reduced motion support
- Screen reader friendly
- Plain language mode
- 44x44px minimum touch targets

## Team

Built for ElleHacks 2026 - Accessibility Theme

## License

MIT
