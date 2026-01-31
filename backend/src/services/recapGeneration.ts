import OpenAI from 'openai';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
 * Generate a recap from transcript at specified reading level
 */
export async function generateRecap(
  transcript: string,
  readingLevelGrade: number = 7
): Promise<RecapResult> {
  if (!openai) {
    console.log('No OpenAI API key, using mock recap');
    return getMockRecap(transcript, readingLevelGrade);
  }

  const levelGuidelines = getReadingLevelGuidelines(readingLevelGrade);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly, supportive assistant creating class recaps for neurodivergent students.

Reading Level: Grade ${readingLevelGrade}
${levelGuidelines}

Create a summary that:
1. Uses short, clear sentences (${readingLevelGrade <= 6 ? '5-8' : readingLevelGrade <= 8 ? '8-12' : '10-15'} words max)
2. Has a warm, encouraging tone
3. Avoids sarcasm, jokes, or confusing idioms
4. Defines any difficult words
5. Ends with ONE gentle encouragement (not over the top)

Respond in JSON format:
{
  "summaryText": "Your friendly summary here (3-7 sentences)",
  "keyTerms": [
    {"term": "word", "explanation": "simple explanation"}
  ]
}

IMPORTANT:
- Be genuinely supportive, not patronizing
- Focus on what was learned, not what was missed
- Keep it brief - no more than 100 words in the summary`,
        },
        {
          role: 'user',
          content: `Create a recap for this class transcript:\n\n"${transcript}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return getMockRecap(transcript, readingLevelGrade);
    }

    const result = JSON.parse(content);
    return {
      summaryText: result.summaryText || getMockSummary(readingLevelGrade),
      keyTerms: result.keyTerms || [],
    };
  } catch (error) {
    console.error('Recap generation error:', error);
    return getMockRecap(transcript, readingLevelGrade);
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

/**
 * Mock recap for demo/offline mode
 */
function getMockRecap(transcript: string, readingLevelGrade: number): RecapResult {
  return {
    summaryText: getMockSummary(readingLevelGrade),
    keyTerms: getMockKeyTerms(transcript),
  };
}

function getMockSummary(grade: number): string {
  if (grade <= 6) {
    return "Today you learned about plants. Plants are amazing! They use sunlight to make food. This is called photosynthesis. You did a great job listening. Proud of you!";
  } else if (grade <= 8) {
    return "Today's class covered photosynthesis - how plants make their own food. Plants use sunlight, water, and carbon dioxide in this process. They also release oxygen, which we need to breathe. You followed along well today!";
  } else {
    return "Today's lesson explored the process of photosynthesis in detail. Plants convert light energy into chemical energy through chlorophyll molecules in their leaves. This reaction produces glucose for the plant's energy needs and releases oxygen as a byproduct. Good work staying engaged with the material.";
  }
}

function getMockKeyTerms(transcript: string): KeyTerm[] {
  const lowerTranscript = transcript.toLowerCase();
  const terms: KeyTerm[] = [];
  
  if (lowerTranscript.includes('photosynthesis')) {
    terms.push({
      term: 'Photosynthesis',
      explanation: 'How plants make food using sunlight',
    });
  }
  
  if (lowerTranscript.includes('chlorophyll')) {
    terms.push({
      term: 'Chlorophyll',
      explanation: 'The green stuff in leaves that catches light',
    });
  }
  
  // Add some default terms if none found
  if (terms.length === 0) {
    terms.push({
      term: 'Class topic',
      explanation: 'The main subject discussed today',
    });
  }
  
  return terms;
}

export default {
  generateRecap,
};
