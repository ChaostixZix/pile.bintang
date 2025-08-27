import { GoogleGenerativeAI } from '@google/generative-ai';
import { safeParseJson } from '../utils/jsonParser';
import { getKey } from '../utils/store';

// Initialize the Gemini client - will be re-initialized with proper key when needed
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;
let jsonModel: any = null;

// Initialize Gemini client with the stored API key
async function initializeGemini() {
  try {
    const apiKey = await getKey() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No Gemini API key available');
    }

    genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the model instance for regular text generation
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    // Get the model instance for JSON generation
    jsonModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    return false;
  }
}

/**
 * Stream function that generates content using Gemini API with streaming
 * @param prompt - The text prompt to send to Gemini
 * @returns AsyncGenerator that yields text chunks from the streaming response
 */
export async function* stream(prompt: string) {
  try {
    // Ensure Gemini is initialized
    if (!model) {
      const initialized = await initializeGemini();
      if (!initialized || !model) {
        throw new Error('Failed to initialize Gemini client');
      }
    }

    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        console.log('Gemini chunk:', text); // Log chunks to main process console
        yield text;
      }
    }
  } catch (error) {
    console.error('Error in Gemini stream:', error);
    throw error;
  }
}

/**
 * JSON prompt templates for consistent structured responses
 */
export const JSON_TEMPLATES = {
  summary: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 100 },
        summary: { type: 'string', maxLength: 500 },
        keyThemes: { type: 'array', items: { type: 'string' }, maxItems: 5 },
        mood: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['title', 'summary', 'keyThemes', 'mood', 'confidence'],
      additionalProperties: false
    },
    systemPrompt: 'You are an expert at analyzing journal entries and creating structured summaries. Respond only with valid JSON matching the exact schema provided.'
  },
  
  metadata: {
    schema: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
        category: { type: 'string', maxLength: 50 },
        importance: { type: 'string', enum: ['low', 'medium', 'high'] },
        actionItems: { type: 'array', items: { type: 'string' }, maxItems: 5 }
      },
      required: ['tags', 'category', 'importance', 'actionItems'],
      additionalProperties: false
    },
    systemPrompt: 'You are an expert at extracting metadata from text content. Respond only with valid JSON matching the exact schema provided.'
  }
};

/**
 * Generate structured JSON content using Gemini API with strict schema enforcement
 * @param prompt - The text prompt to analyze
 * @param templateName - The JSON template to use (summary, metadata)
 * @returns Promise that resolves to a parsed JavaScript object matching the schema
 */
export async function json(prompt: string, templateName: keyof typeof JSON_TEMPLATES = 'summary'): Promise<any> {
  try {
    // Ensure Gemini is initialized
    if (!jsonModel) {
      const initialized = await initializeGemini();
      if (!initialized || !jsonModel) {
        throw new Error('Failed to initialize Gemini client');
      }
    }

    const template = JSON_TEMPLATES[templateName];
    
    // Construct schema-aware prompt
    const fullPrompt = `${template.systemPrompt}

Schema to follow:
${JSON.stringify(template.schema, null, 2)}

Content to analyze:
${prompt}

Return only valid JSON that strictly matches the schema above. No additional text or explanation.`;

    const result = await jsonModel.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('Gemini JSON response:', text);
    
    // Parse and validate JSON response using safe parser
    const parseResult = safeParseJson(text, templateName);
    
    if (!parseResult.success) {
      console.error('JSON parsing failed:', parseResult.error);
      // Still return the data (fallback values) but log the error
      // This ensures the application continues to function even with invalid JSON
    }
    
    return parseResult.data;
  } catch (error) {
    console.error('Error in Gemini JSON generation:', error);
    throw error;
  }
}

export { genAI, model, jsonModel, initializeGemini };