import { NextRequest, NextResponse } from 'next/server';
import { Session } from '@/models/Session';
import connectDB from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'sessionId and userId are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find and end session
    const session = await Session.findOne({ _id: sessionId, userId });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.endedAt) {
      return NextResponse.json(
        { error: 'Session already ended' },
        { status: 400 }
      );
    }

    // Update session
    session.endedAt = new Date();
    session.durationSec = Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    await session.save();

    // Calculate summary stats
    const stats = {
      duration: session.durationSec,
      calmMinutes: session.calmMinutes,
      stressorsDetected: session.detections.events.length,
      interventionsUsed: {
        haptic: session.interventionsUsed.hapticSent,
        breathe: session.interventionsUsed.breatheUsed,
        journal: session.interventionsUsed.journalUsed
      },
      overallState: session.detections.overallState
    };

    return NextResponse.json({
      sessionId: session._id.toString(),
      endedAt: session.endedAt,
      stats,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('Failed to end session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
