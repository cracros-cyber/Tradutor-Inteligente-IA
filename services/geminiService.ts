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
      description: 'O código de idioma ISO 639-1 detectado do texto de entrada (por exemplo, "en", "pt", "es").',
    },
    translatedText: {
      type: Type.STRING,
      description: 'O texto traduzido.',
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
      Você é um tradutor poliglota especialista.
      Sua tarefa é analisar o texto a seguir, identificar seu idioma e, em seguida, traduzi-lo para o idioma de destino especificado.

      O idioma de destino para esta tradução é: ${langName} (${targetLang})

      A resposta deve ser um objeto JSON válido que esteja em conformidade com o esquema fornecido.
      - "detectedLanguage" deve ser o código ISO 639-1 para o idioma detectado da entrada.
      - "translatedText" deve conter o conteúdo traduzido.
      
      Se o texto de entrada for um jargão, sem sentido ou vazio, retorne uma string vazia para "translatedText" e uma string vazia para "detectedLanguage".

      Texto de entrada:
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
      console.warn("Resposta vazia recebida da API Gemini. Isso pode ser devido às configurações de segurança.");
      // Return a predictable empty state that App.tsx can handle gracefully.
      return { translatedText: '', detectedLanguage: '' };
    }

    const result = JSON.parse(jsonString);

    if (result && typeof result.detectedLanguage === 'string' && typeof result.translatedText === 'string') {
        return result as TranslationResponse;
    }

    console.error("Estrutura JSON inválida recebida da API:", result);
    throw new Error("Estrutura de dados inválida recebida da API de tradução.");

  } catch (error) {
    if (error instanceof Error && error.message === "API_KEY_MISSING") {
        throw error;
    }
    console.error("Erro no serviço translateAndDetect:", error);
    // Let the UI handle this with a generic message
    throw new Error("Falha ao obter tradução da API Gemini.");
  }
};