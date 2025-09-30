import { GoogleGenAI, Type } from "@google/genai";
import type { Language, TranslationResponse } from '../types';

// Lazily initialize to avoid crashing on module load if API_KEY is missing.
let ai: GoogleGenAI | null = null;
const getAiClient = () => {
    if (ai) {
        return ai;
    }
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        return ai;
    }
    return null;
}

const model = 'gemini-2.5-flash';

const translationSchema = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: {
      type: Type.STRING,
      description: 'The detected ISO 639-1 language code of the input text (e.g., "en", "pt", "es").',
    },
    translatedText: {
      type: Type.STRING,
      description: 'The translated text.',
    },
  },
  required: ['detectedLanguage', 'translatedText'],
};

export const translateAndDetect = async (text: string, targetLang: Language, langName: string): Promise<TranslationResponse> => {
  const aiClient = getAiClient();
  if (!aiClient) {
      // Throw a specific error for the UI to catch.
      throw new Error("API_KEY_MISSING");
  }

  try {
    const prompt = `
      You are an expert polyglot translator.
      Your task is to analyze the following text, identify its language, and then translate it to the target language specified.

      The target language for this translation is: ${langName} (${targetLang})

      The response must be a valid JSON object that conforms to the provided schema.
      - "detectedLanguage" must be the ISO 639-1 code for the detected language of the input.
      - "translatedText" must contain the translated content.
      
      If the input text is gibberish, nonsensical, or empty, return an empty string for "translatedText" and an empty string for "detectedLanguage".

      Input text:
      ---
      ${text}
      ---
    `;

    const response = await aiClient.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        temperature: 0.3,
      },
    });
    
    const jsonString = response.text.trim();
    if (!jsonString) {
      console.warn("Received empty response from Gemini API. This might be due to safety settings.");
      // Return a predictable empty state that App.tsx can handle gracefully.
      return { translatedText: '', detectedLanguage: '' };
    }

    const result = JSON.parse(jsonString);

    if (result && typeof result.detectedLanguage === 'string' && typeof result.translatedText === 'string') {
        return result as TranslationResponse;
    }

    console.error("Invalid JSON structure received from API:", result);
    throw new Error("Received invalid data structure from translation API.");

  } catch (error) {
    if (error instanceof Error && error.message === "API_KEY_MISSING") {
        throw error;
    }
    console.error("Error in translateAndDetect service:", error);
    // Let the UI handle this with a generic message
    throw new Error("Failed to get translation from Gemini API.");
  }
};