import { NextRequest, NextResponse } from 'next/server';
import { Session } from '@/models/Session';
import connectDB from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Create new session
    const session = new Session({
      userId,
      startedAt: new Date(),
      detections: {
        overallState: 'unknown',
        events: []
      },
      interventionsUsed: {
        hapticSent: false,
        breatheUsed: false,
        journalUsed: false
      },
      calmMinutes: 0
    });

    await session.save();

    return NextResponse.json({
      sessionId: session._id.toString(),
      startedAt: session.startedAt,
      message: 'Session started successfully'
    });

  } catch (error) {
    console.error('Failed to start session:', error);
    return NextResponse.json(
      { error: 'Failed to start session' },
      { status: 500 }
    );
  }
}
