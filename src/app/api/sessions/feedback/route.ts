import { NextRequest, NextResponse } from 'next/server';
import { Session } from '@/models/Session';
import connectDB from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, mood, emoji, timestamp } = await request.json();

    if (!sessionId || !userId || !mood) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find and update session with user feedback
    const session = await Session.findOne({ _id: sessionId, userId });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Map mood to feedback values
    const feltStressful = 
      mood === 'stressed' ? 'yes' : 
      mood === 'calm' ? 'no' : 
      'not_sure';

    session.userFeedback = {
      feltStressful,
      notes: emoji || undefined
    };

    // End session if it's still active
    if (!session.endedAt) {
      session.endedAt = new Date();
      session.durationSec = Math.floor(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
      );
    }

    await session.save();

    return NextResponse.json({
      success: true,
      mood,
      emoji,
      timestamp
    });

  } catch (error) {
    console.error('Failed to save feedback:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
