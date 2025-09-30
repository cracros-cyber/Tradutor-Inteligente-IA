import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Language } from './types';
import { translateAndDetect } from './services/geminiService';
import LanguageInput from './components/LanguageInput';
import { SwapIcon } from './components/icons/SwapIcon';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';

const supportedLanguages: Record<Language, string> = {
  en: 'Inglês',
  pt: 'Português (BR)',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  it: 'Italiano',
  ja: 'Japonês',
  ru: 'Russo',
  zh: 'Chinês (Mandarim)',
  hi: 'Hindi',
  ar: 'Árabe',
  ko: 'Coreano',
};

const App: React.FC = () => {
  const [sourceLang, setSourceLang] = useState<Language>('pt');
  const [targetLang, setTargetLang] = useState<Language>('en');
  const [inputText, setInputText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<React.ReactNode | null>(null);

  const debounceTimeout = useRef<number | null>(null);
  const previousSourceLang = useRef<Language>(sourceLang);

  useEffect(() => {
    previousSourceLang.current = sourceLang;
  }, [sourceLang]);


  const getTranslation = useCallback(async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await translateAndDetect(text, targetLang, supportedLanguages[targetLang]);
      
      setTranslatedText(result.translatedText);
      const detectedLang = result.detectedLanguage;

      if (detectedLang) { // Only process if a language was detected
          const isSupported = (lang: string): lang is Language => lang in supportedLanguages;

          if (isSupported(detectedLang)) {
              // Language detected is supported.
              if (detectedLang !== sourceLang) {
                  const newSourceLang = detectedLang;
                  if (newSourceLang === targetLang) {
                      setTargetLang(previousSourceLang.current);
                  }
                  setSourceLang(newSourceLang);
              }
          } else {
              // Language detected but not supported
              let detectedLangName = detectedLang;
              try {
                  const languageNames = new Intl.DisplayNames(['pt-BR'], { type: 'language' });
                  const name = languageNames.of(detectedLang);
                  if (name) {
                    detectedLangName = name.charAt(0).toUpperCase() + name.slice(1);
                  }
              } catch (e) {
                  console.warn("Could not get display name for language code:", detectedLang);
              }
              setError(<span>{`O idioma detectado (${detectedLangName}) não é suportado.`}</span>);
              setTranslatedText(''); 
          }
      }
      // If detectedLang is empty (e.g., for gibberish), we do nothing with selectors/errors.
      // The translatedText is already set (likely to '').
    } catch (err) {
      if (err instanceof Error && err.message === 'API_KEY_MISSING') {
          setError(
            <>
              <span>A chave da API está faltando. A funcionalidade de tradução está desativada.</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-300 font-semibold"
              >
                Obtenha sua chave do Google Gemini aqui.
              </a>
            </>
          );
      } else {
          setError(
            <>
              <span>Falha ao traduzir. Por favor, tente novamente.</span>
              <button
                onClick={() => getTranslation(inputText)}
                className="mt-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Tentar Novamente
              </button>
            </>
          );
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [sourceLang, targetLang, inputText]);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = window.setTimeout(() => {
      getTranslation(inputText);
    }, 800);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [inputText, getTranslation]);

  const handleSwapLanguages = () => {
    const currentInput = inputText;
    const currentTranslated = translatedText;
    
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(currentTranslated);
    setTranslatedText(currentInput);
  };

  const handleClearInput = () => {
    setInputText('');
    setTranslatedText('');
    setError(null);
  }

  const languageOptions = Object.entries(supportedLanguages).map(([code, name]) => (
    <option key={code} value={code}>{name}</option>
  ));

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          Tradutor Inteligente AI
        </h1>
        <p className="text-gray-400 mt-2">
          Tradução automática multilíngue com Gemini
        </p>
      </header>

      <main className="w-full max-w-4xl bg-gray-800/50 rounded-2xl shadow-lg border border-gray-700 p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4 relative">
          
          <div className="flex-1 flex flex-col w-full">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as Language)}
              className="mb-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 cursor-pointer"
              aria-label="Idioma de origem"
            >
              {languageOptions}
            </select>
            <LanguageInput
              id="source-language"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onClear={handleClearInput}
              placeholder="Digite o texto para traduzir..."
            />
          </div>

          <div className="flex justify-center items-center my-2 md:my-0">
            <button
              onClick={handleSwapLanguages}
              className="p-3 rounded-full bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white transition-all duration-200 ease-in-out transform hover:rotate-180 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Trocar idiomas"
            >
              <SwapIcon />
            </button>
          </div>

          <div className="flex-1 flex flex-col w-full">
             <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as Language)}
              className="mb-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 cursor-pointer"
              aria-label="Idioma de destino"
            >
              {languageOptions}
            </select>
            <LanguageInput
              id="target-language"
              value={translatedText}
              isLoading={isLoading}
              isReadOnly={true}
              placeholder="A tradução aparecerá aqui..."
            />
          </div>

        </div>
        {error && (
          <div 
            className="mt-4 text-red-300 bg-red-900/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-center text-center gap-3 fade-in-error"
            role="alert"
          >
              <div className="flex-shrink-0 text-red-400">
                <AlertTriangleIcon />
              </div>
              <div className="flex flex-col items-center gap-1">{error}</div>
          </div>
        )}
      </main>

      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Desenvolvido com a API Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;