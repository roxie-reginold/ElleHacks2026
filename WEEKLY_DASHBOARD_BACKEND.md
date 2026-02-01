# Weekly Dashboard Backend Implementation

## Overview

Implemented a complete backend system for the Weekly Student Dashboard feature using:
- **MongoDB**: Store emotion logs, wins, and weekly insights
- **Gemini 2.0 Flash API**: Generate personalized, AI-powered insights
- **Express.js**: RESTful API endpoints
- **TypeScript**: Type-safe aggregation and analysis

## What Was Built

### 1. **Weekly Dashboard Service** (`backend/src/services/weeklyDashboard.ts`)

Core aggregation and analysis engine:

#### Key Functions:

**`getWeeklyDashboard(userId, weekOffset)`**
- Aggregates all data for a specific week (Mon-Sun)
- Calculates emotion metrics, win counts, breathing exercises used
- Identifies patterns: calmest time of day, most stressful context
- Generates AI insights via Gemini
- Returns organized dashboard response

**`aggregateWeeklyData(userId, weekOffset)`**
- Queries EmotionLog, Win, and Session documents for the week
- Calculates:
  - `averageStressLevel` (1-10)
  - `calmestTimeOfDay` (morning/afternoon/evening)
  - `mostStressfulContext` (e.g., "group work", "presentations")
  - Time and context distributions

**`generateGeminiInsights(aggregatedData)`**
- Calls Gemini 2.0 Flash with detailed prompt
- Generates 2-3 personalized insights + 1-2 actionable suggestions
- Fallback to mock insights if API unavailable
- Uses simple, supportive language (8th grade level)

**`getWeeklyTrends(userId, numWeeks)`**
- Fetches dashboard data for multiple weeks
- Calculates trend: improving/stable/declining stress levels
- Returns chronological week data for UI timeline

**Helper Functions:**
- `getWeekBounds()` - Calculate Monday-Sunday for any week offset
- `getTimeOfDay()` - Categorize timestamps (morning/afternoon/evening)
- `generateMockInsights()` - Fallback insights when API unavailable
- `saveWeeklyInsight()` - Cache results in MongoDB

### 2. **Updated Dashboard Routes** (`backend/src/routes/dashboard.ts`)

#### Endpoints:

**`GET /api/dashboard/weekly`**
```
Query params:
  - userId (required): Student ID
  - weekOffset (optional): 0 = current week, -1 = last week, etc.

Response:
{
  "period": {
    "start": "2026-01-27T00:00:00.000Z",
    "end": "2026-02-02T23:59:59.999Z"
  },
  "stats": {
    "totalEmotionLogs": 5,
    "totalWins": 2,
    "totalBreathingBreaks": 3,
    "averageStressLevel": 5.2
  },
  "patterns": {
    "calmestTimeOfDay": "afternoon",
    "mostStressfulContext": "group work",
    "timeDistribution": {
      "morning": 2,
      "afternoon": 2,
      "evening": 1
    },
    "contextPatterns": {
      "group work": 3,
      "presentations": 2
    }
  },
  "insights": [
    "You checked in on your feelings 5 times this week. That's great self-awareness!",
    "You tend to feel calmer in the afternoon. Notice when you feel more peaceful."
  ],
  "suggestions": [
    "Try using a breathing exercise when stress feels high—even 2 minutes helps.",
    "Group work feels challenging. You're not alone—many students feel this way."
  ],
  "recentEmotionLogs": [...],
  "recentWins": [...]
}
```

**`GET /api/dashboard/trends`**
```
Query params:
  - userId (required)
  - numWeeks (optional): Default 4

Response: Array of weekly dashboards + trend analysis
{
  "weeks": [...],
  "currentWeek": {...},
  "trend": "improving" | "stable" | "declining"
}
```

**`GET /api/dashboard/session/:sessionId`**
- Fetch individual session details

### 3. **Data Models** (Already in `backend/src/models/EmotionLog.ts`)

**EmotionLog**: Daily emoji check-ins with stress levels and context
**Win**: Tracked achievements with categories (social/academic/emotional)
**WeeklyInsight**: Generated summaries cached for performance

## How It Works

### Weekly Data Aggregation Flow:

1. **User requests dashboard** → GET `/api/dashboard/weekly?userId=xyz`
2. **Service calculates week bounds** (Monday 00:00 to Sunday 23:59)
3. **Parallel queries** for EmotionLogs, Wins, Sessions within that week
4. **Metrics calculation**:
   - Group emotion logs by time of day
   - Count wins by category
   - Extract stress levels and contexts
   - Find hour with most calm logs
   - Identify most frequent stressful context
5. **Gemini API call** with aggregated data + supportive prompt
6. **Parse & cache response** in WeeklyInsight document
7. **Return organized dashboard** to frontend

### Example Gemini Prompt:

```
You are a supportive school counselor analyzing a student's weekly emotional data...

Emotion Check-ins: 5 logged
- Average stress level: 5.2/10
- Calmest time of day: afternoon
- Most stressful context: group work

Wins/Achievements logged: 2
Breathing exercises used: 3 times

[Return JSON with insights and suggestions]
```

## API Features

✅ **Week-based aggregation** - Automatic Monday-Sunday calculation with timezone safety
✅ **Gemini AI integration** - Latest model (gemini-2.0-flash) for personalized insights
✅ **Graceful fallbacks** - Mock insights if API unavailable or database offline
✅ **Trend analysis** - Multi-week comparison for progress tracking
✅ **Performance optimized** - Caches WeeklyInsight documents to reduce API calls
✅ **Time pattern detection** - Identifies calmest times and stressful contexts
✅ **Student-friendly language** - Simple, supportive tone (8th grade level)

## Environment Variables

Add to `.env`:
```
GEMINI_API_KEY=your-gemini-api-key-here
MONGODB_URI=mongodb+srv://...  # Optional, works without DB
PORT=3001
```

## Recent Changes

1. ✅ Added `@google/generative-ai` dependency to package.json
2. ✅ Created `weeklyDashboard.ts` service with full aggregation logic
3. ✅ Updated `dashboard.ts` routes to use new service
4. ✅ Implemented Gemini 2.0 Flash integration
5. ✅ Added `/api/dashboard/trends` endpoint for trend analysis
6. ✅ Added week bounds helper with proper Monday-Sunday handling
7. ✅ TypeScript types for all aggregated data structures

## Testing the Endpoint

### With Mock Data (No API Key):
```bash
curl "http://localhost:3001/api/dashboard/weekly?userId=student123"
```
Returns mock insights automatically.

### With Gemini API:
1. Set `GEMINI_API_KEY` in .env
2. Add sample EmotionLogs and Wins via frontend
3. Call same endpoint → Gemini generates insights

### Get 4-Week Trends:
```bash
curl "http://localhost:3001/api/dashboard/trends?userId=student123&numWeeks=4"
```

## Next Steps (Frontend)

Frontend can now:
1. Call `/api/dashboard/weekly` to display weekly summary
2. Render insights and suggestions in supportive UI
3. Show time/context distribution as charts
4. Call `/api/dashboard/trends` for progress visualization
5. Store recent emotion logs for timeline view

## Architecture Notes

- **Service-driven design**: All logic in `weeklyDashboard.ts` service
- **Database agnostic**: Gracefully handles MongoDB unavailability
- **API-resilient**: Gemini failures fall back to structured mock insights
- **Type-safe**: Full TypeScript interfaces for all data structures
- **Scalable**: Indexed MongoDB queries for fast aggregation
