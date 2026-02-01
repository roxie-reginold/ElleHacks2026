import OpenAI from 'openai';
import { generateCalmingPrompt } from './elevenLabsService';
import path from 'path';

// Initialize OpenRouter client (OpenAI-compatible)
const openrouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://whisper-lite.app',
        'X-Title': 'Whisper Lite',
      },
    })
  : null;

// OpenRouter model for Gemini
const GEMINI_MODEL = 'google/gemini-2.5-flash';

export interface KeyTerm {
  term: string;
  explanation: string;
}

export interface RecapResult {
  summaryText: string;
  keyTerms: KeyTerm[];
  audioUrl?: string;
}

/**
 * Generate a recap from transcript at specified reading level using Gemini via OpenRouter
 * Optionally generates audio using ElevenLabs TTS
 */
export async function generateRecap(
  transcript: string,
  readingLevelGrade: number = 7,
  generateAudio: boolean = false
): Promise<RecapResult> {
  if (!openrouter) {
    console.error('No OpenRouter API key configured - recap generation unavailable');
    throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.');
  }

  const levelGuidelines = getReadingLevelGuidelines(readingLevelGrade);

  const systemPrompt = `You are a friendly, supportive assistant creating class recaps for neurodivergent students.

Reading Level: Grade ${readingLevelGrade}
${levelGuidelines}

Create a summary that:
1. Uses short, clear sentences (${readingLevelGrade <= 6 ? '5-8' : readingLevelGrade <= 8 ? '8-12' : '10-15'} words max)
2. Has a warm, encouraging tone
3. Avoids sarcasm, jokes, or confusing idioms
4. Defines any difficult words
5. Ends with ONE gentle encouragement (not over the top)

IMPORTANT:
- Be genuinely supportive, not patronizing
- Focus on what was learned, not what was missed
- Keep it brief - no more than 100 words in the summary

Return JSON with:
- summaryText: the recap summary
- keyTerms: array of { term: string, explanation: string }`;

  try {
    const response = await openrouter.chat.completions.create({
      model: GEMINI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a recap for this class transcript:\n\n"${transcript}"` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content || '{}';
    
    // Parse JSON response, handling potential markdown code blocks
    let parsed: any;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response:', parseError);
      // Try to extract meaningful content from the response
      parsed = {
        summaryText: responseText.slice(0, 500),
        keyTerms: [],
      };
    }

    console.log('Recap generated successfully via Gemini (OpenRouter)');

    const result: RecapResult = {
      summaryText: parsed.summaryText || 'Summary could not be generated.',
      keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
    };

    // Generate audio using ElevenLabs if requested
    if (generateAudio && result.summaryText) {
      try {
        const audioResult = await generateCalmingPrompt(result.summaryText);
        if (audioResult.success && audioResult.audioPath) {
          // Return just the filename for the audio URL (frontend will construct full URL)
          result.audioUrl = path.basename(audioResult.audioPath);
          console.log('Recap audio generated via ElevenLabs');
        }
      } catch (audioError) {
        console.warn('Could not generate recap audio:', audioError);
        // Continue without audio - it's optional
      }
    }

    return result;
  } catch (error: any) {
    console.error('Gemini recap generation error:', error);
    throw new Error(`Recap generation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get reading level specific guidelines
 */
function getReadingLevelGuidelines(grade: number): string {
  if (grade <= 6) {
    return `
Guidelines for Grade 6:
- Use very simple words (1-2 syllables preferred)
- Short sentences only
- Define ALL subject-specific words
- Use concrete examples
- Very encouraging tone`;
  } else if (grade <= 8) {
    return `
Guidelines for Grade 7-8:
- Use common vocabulary
- Medium-length sentences
- Define technical terms
- Include main concepts
- Supportive tone`;
  } else {
    return `
Guidelines for Grade 9-10:
- More varied vocabulary okay
- Can use slightly complex sentences
- Define only specialized terms
- Include key details
- Professional but warm tone`;
  }
}

export default {
  generateRecap,
};
