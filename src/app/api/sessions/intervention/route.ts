import { NextRequest, NextResponse } from 'next/server';
import { Session } from '@/models/Session';
import connectDB from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, interventionType, timestamp } = await request.json();

    if (!sessionId || !userId || !interventionType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Update session with intervention
    const session = await Session.findOne({ _id: sessionId, userId });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update interventions used
    if (interventionType === 'breathe') {
      session.interventionsUsed.breatheUsed = true;
    } else if (interventionType === 'journal') {
      session.interventionsUsed.journalUsed = true;
    }

    // Mark haptic as sent for any intervention
    session.interventionsUsed.hapticSent = true;

    await session.save();

    return NextResponse.json({
      success: true,
      interventionType,
      timestamp
    });

  } catch (error) {
    console.error('Failed to log intervention:', error);
    return NextResponse.json(
      { error: 'Failed to log intervention' },
      { status: 500 }
    );
  }
}
