import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Session } from '@/models/Session';
import connectDB from '@/lib/db';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, volumeDb, audioData, timestamp } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Analyze with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are analyzing classroom audio for a neurodivergent student to detect stress triggers.

Current audio metrics:
- Volume: ${volumeDb} dB
- Audio frequency data: ${audioData ? 'Available' : 'Not available'}
- Time: ${new Date(timestamp).toLocaleTimeString()}

Based on these metrics, analyze:
1. Is there a stressor present? (sudden loud noise, multiple overlapping voices, harsh tones)
2. What is the stress level? (calm, mild, moderate, high)
3. What might be triggering this?

Respond ONLY with valid JSON in this exact format:
{
  "level": "calm" | "mild" | "moderate" | "high",
  "confidence": 0.0-1.0,
  "triggers": ["trigger1", "trigger2"],
  "reasoning": "brief explanation"
}

Consider:
- Volume > 80dB = potential stressor
- Volume > 90dB = likely stressor
- Rapid changes = potential anxiety trigger
- Sustained high volume = definite stressor`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    const analysis = JSON.parse(jsonText);

    // Log detection to MongoDB
    await connectDB();
    
    const session = await Session.findOne({ _id: sessionId, userId });
    
    if (session) {
      // Add detection event if stressor found
      if (analysis.level !== 'calm') {
        const event = {
          t: Date.now(),
          type: analysis.triggers.includes('loud') ? 'crowd_noise' : 
                analysis.triggers.includes('harsh') ? 'harsh_tone' : 
                'urgent_tone',
          confidence: analysis.confidence,
          note: analysis.reasoning
        };

        session.detections.events.push(event);
        session.detections.overallState = 
          analysis.level === 'high' || analysis.level === 'moderate' 
            ? 'stressor_detected' 
            : session.detections.overallState;
        
        await session.save();
      } else {
        // Increment calm minutes
        session.calmMinutes += 1;
        session.detections.overallState = 'calm';
        await session.save();
      }
    }

    return NextResponse.json({
      level: analysis.level,
      confidence: analysis.confidence,
      triggers: analysis.triggers,
      timestamp
    });

  } catch (error) {
    console.error('Stress analysis error:', error);
    
    // Fallback to simple volume-based detection
    const { volumeDb } = await request.json();
    const level = 
      volumeDb > 90 ? 'high' :
      volumeDb > 80 ? 'moderate' :
      volumeDb > 70 ? 'mild' :
      'calm';

    return NextResponse.json({
      level,
      confidence: 0.6,
      triggers: volumeDb > 80 ? ['loud_environment'] : [],
      timestamp: Date.now()
    });
  }
}
