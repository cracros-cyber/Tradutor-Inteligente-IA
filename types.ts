export type Language = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ru' | 'zh' | 'hi' | 'ar' | 'ko';

export interface TranslationResponse {
  detectedLanguage: string;
  translatedText: string;
}