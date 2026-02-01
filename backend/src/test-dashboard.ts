import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { EmotionLog, Win } from './models/EmotionLog';
import Session from './models/Session';
import { getWeeklyDashboard } from './services/weeklyDashboard';

dotenv.config();

async function generateFakeEmotionLogs(userId: string, count: number = 10) {
  const emojis = ['\u{1F60C}', '\u{1F623}', '\u{1F60A}', '\u{1F624}', '\u{1F636}', '\u{1F630}', '\u{1F642}', '\u{1F62C}'];
  const contexts = ['group work', 'presentations', 'science class', 'math class', 'lunch', 'gym class'];
  const emotionLogs = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursAgo);

    emotionLogs.push({
      userId,
      timestamp,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      context: contexts[Math.floor(Math.random() * contexts.length)],
      stressLevel: Math.floor(Math.random() * 10) + 1,
      notes: `Test note ${i + 1}`,
    });
  }

  await EmotionLog.insertMany(emotionLogs);
  console.log(`\u2705 Created ${count} fake emotion logs`);
}

async function generateFakeWins(userId: string, count: number = 5) {
  const achievements = [
    'Asked a question in class',
    'Stayed calm during group work',
    'Helped a friend',
    'Completed homework on time',
    'Tried a new breathing exercise',
    'Spoke up in a meeting',
    'Made it through a tough day',
  ];
  const categories: ('social' | 'academic' | 'emotional')[] = ['social', 'academic', 'emotional'];
  const wins = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);

    const weekNumber = Math.floor(timestamp.getTime() / (7 * 24 * 60 * 60 * 1000));
    const year = timestamp.getFullYear();

    wins.push({
      userId,
      timestamp,
      achievement: achievements[Math.floor(Math.random() * achievements.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      weekNumber,
      year,
    });
  }

  await Win.insertMany(wins);
  console.log(`\u2705 Created ${count} fake wins`);
}

async function generateFakeSessions(userId: string, count: number = 8) {
  const sessions = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const startedAt = new Date();
    startedAt.setDate(startedAt.getDate() - daysAgo);
    startedAt.setHours(Math.floor(Math.random() * 14) + 6);

    const endedAt = new Date(startedAt);
    endedAt.setMinutes(startedAt.getMinutes() + Math.floor(Math.random() * 45) + 15);

    const durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    const detectionTypes = ['fast_speech', 'laughter_spike', 'harsh_tone', 'sarcasm_likely', 'crowd_noise'];
    const overallStates: ('calm' | 'stressor_detected' | 'unknown')[] = ['calm', 'stressor_detected', 'unknown'];

    sessions.push({
      userId,
      startedAt,
      endedAt,
      durationSec,
      transcript: `Test session ${i + 1} transcript...`,
      detections: {
        overallState: overallStates[Math.floor(Math.random() * overallStates.length)],
        events: [
          {
            t: Math.random() * 100,
            type: detectionTypes[Math.floor(Math.random() * detectionTypes.length)],
            confidence: Math.random(),
            note: 'Test detection note',
          },
        ],
      },
      interventionsUsed: {
        hapticSent: Math.random() > 0.5,
        breatheUsed: Math.random() > 0.6,
        journalUsed: Math.random() > 0.7,
      },
      calmMinutes: Math.floor(Math.random() * 30),
    });
  }

  await Session.insertMany(sessions);
  console.log(`\u2705 Created ${count} fake sessions`);
}

async function cleanupTestData(userId: string) {
  await EmotionLog.deleteMany({ userId });
  await Win.deleteMany({ userId });
  await Session.deleteMany({ userId });
  console.log('\u{1F9F9} Cleaned up test data');
}

async function testWeeklyDashboard() {
  const testUserId = 'test-user-' + Date.now();

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('\u274C MONGODB_URI not found in .env file');
      process.exit(1);
    }

    console.log('\u{1F50C} Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('\u2705 Connected to MongoDB');

    console.log('\n\u{1F4CA} Generating fake data...');
    await generateFakeEmotionLogs(testUserId, 12);
    await generateFakeWins(testUserId, 6);
    await generateFakeSessions(testUserId, 10);

    console.log('\n\u{1F9EA} Testing weekly dashboard...');
    const dashboard = await getWeeklyDashboard(testUserId, 0);

    console.log('\n\u{1F4C8} Weekly Dashboard Results:');
    console.log('='.repeat(60));
    console.log(`Period: ${dashboard.period.start} to ${dashboard.period.end}`);
    console.log('\nStats:');
    console.log(`  - Emotion Logs: ${dashboard.stats.totalEmotionLogs}`);
    console.log(`  - Wins: ${dashboard.stats.totalWins}`);
    console.log(`  - Breathing Breaks: ${dashboard.stats.totalBreathingBreaks}`);
    console.log(`  - Average Stress Level: ${dashboard.stats.averageStressLevel}/10`);
    
    console.log('\nPatterns:');
    console.log(`  - Calmest Time: ${dashboard.patterns.calmestTimeOfDay}`);
    console.log(`  - Most Stressful Context: ${dashboard.patterns.mostStressfulContext}`);
    console.log(`  - Time Distribution:`, dashboard.patterns.timeDistribution);
    console.log(`  - Context Patterns:`, dashboard.patterns.contextPatterns);

    console.log('\n\u{1F4A1} Insights:');
    dashboard.insights.forEach((insight, i) => {
      console.log(`  ${i + 1}. ${insight}`);
    });

    console.log('\n\u{1F4AD} Suggestions:');
    dashboard.suggestions.forEach((suggestion, i) => {
      console.log(`  ${i + 1}. ${suggestion}`);
    });

    console.log('\n' + '='.repeat(60));

    console.log('\n\u{1F9F9} Cleaning up test data...');
    await cleanupTestData(testUserId);

    console.log('\n\u2705 Test completed successfully!');
    
    if (process.env.GEMINI_API_KEY) {
      console.log('\u{1F916} Gemini AI insights were generated');
    } else {
      console.log('\u26A0 Mock insights were used (no GEMINI_API_KEY found)');
    }

  } catch (error) {
    console.error('\n\u274C Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\u{1F44B} Disconnected from MongoDB');
  }
}

testWeeklyDashboard();
