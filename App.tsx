import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Language } from './types';
import { translateAndDetect } from './services/geminiService';
import LanguageInput from './components/LanguageInput';
import { SwapIcon } from './components/icons/SwapIcon';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';

const supportedLanguages: Record<Language, string> = {
  en: 'Inglês', pt: 'Português (BR)', es: 'Espanhol', fr: 'Francês',
  de: 'Alemão', it: 'Italiano', ja: 'Japonês', ru: 'Russo',
  zh: 'Chinês (Mandarim)', hi: 'Hindi', ar: 'Árabe', ko: 'Coreano'
};

const App: React.FC = () => {
  const [sourceLang, setSourceLang] = useState<Language>('pt');
  const [targetLang, setTargetLang] = useState<Language>('en');
  const [inputText, setInputText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ERROR: agora string ou null
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Tipo de erro para decidir se exibe link ou botão
  const [errorType, setErrorType] = useState<'api_key' | 'translation' | null>(null);

  const debounceTimeout = useRef<number | null>(null);
  const previousSourceLang = useRef<Language>(sourceLang);

  useEffect(() => {
    previousSourceLang.current = sourceLang;
  }, [sourceLang]);

  const getTranslation = useCallback(async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      setErrorMessage(null);
      setErrorType(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorType(null);

    try {
      const result = await translateAndDetect(text, targetLang, supportedLanguages[targetLang]);
      setTranslatedText(result.translatedText);
      const detectedLang = result.detectedLanguage;

      if (detectedLang) {
        const isSupported = (lang: string): lang is Language => lang in supportedLanguages;
        if (isSupported(detectedLang) && detectedLang !== sourceLang) {
          if (detectedLang === targetLang) {
            setTargetLang(previousSourceLang.current);
          }
          setSourceLang(detectedLang);
        } else if (!isSupported(detectedLang)) {
          let name = detectedLang;
          try {
            const dn = new Intl.DisplayNames(['pt-BR'], { type: 'language' });
            const n = dn.of(detectedLang);
            if (n) name = n.charAt(0).toUpperCase() + n.slice(1);
          } catch {}
          setErrorMessage(`O idioma detectado (${name}) não é suportado.`);
          setErrorType('translation');
          setTranslatedText('');
        }
      }
    } catch (err: any) {
      if (err.message === 'API_KEY_MISSING') {
        setErrorMessage('A chave da API está faltando. A funcionalidade de tradução está desativada.');
        setErrorType('api_key');
      } else {
        setErrorMessage('Falha ao traduzir. Por favor, tente novamente.');
        setErrorType('translation');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [sourceLang, targetLang]);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = window.setTimeout(() => getTranslation(inputText), 800);
    return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
  }, [inputText, getTranslation]);

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const handleClearInput = () => {
    setInputText('');
    setTranslatedText('');
    setErrorMessage(null);
    setErrorType(null);
  };

  const languageOptions = Object.entries(supportedLanguages).map(([code, name]) =>
    <option key={code} value={code}>{name}</option>
  );

  // Função de renderização de erro
  const renderError = () => {
    if (!errorMessage) return null;
    return (
      <div className="mt-4 text-red-300 bg-red-900/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-center text-center gap-3 fade-in-error" role="alert">
        <div className="flex-shrink-0 text-red-400"><AlertTriangleIcon /></div>
        <div className="flex flex-col items-center gap-1">
          <span>{errorMessage}</span>
          {errorType === 'api_key' && (
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
               className="underline hover:text-blue-300 font-semibold">
              Obtenha sua chave do Google Gemini aqui.
            </a>
          )}
          {errorType === 'translation' && (
            <button onClick={() => getTranslation(inputText)}
                    className="mt-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          Tradutor Inteligente AI
        </h1>
        <p className="text-gray-400 mt-2">Tradução automática multilíngue com Gemini</p>
      </header>

      <main className="w-full max-w-4xl bg-gray-800/50 rounded-2xl shadow-lg border border-gray-700 p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4 relative">
          {/* Origem */}
          <div className="flex-1 flex flex-col w-full">
            <select value={sourceLang} onChange={e => setSourceLang(e.target.value as Language)}
                    className="mb-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              {languageOptions}
            </select>
            <LanguageInput id="source-language" value={inputText}
                           onChange={e => setInputText(e.target.value)}
                           onClear={handleClearInput}
                           placeholder="Digite o texto para traduzir..." />
          </div>

          {/* Swap */}
          <div className="flex justify-center items-center my-2 md:my-0">
            <button onClick={handleSwapLanguages}
                    className="p-3 rounded-full bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white transition-all duration-200 transform hover:rotate-180 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Trocar idiomas">
              <SwapIcon />
            </button>
          </div>

          {/* Destino */}
          <div className="flex-1 flex flex-col w-full">
            <select value={targetLang} onChange={e => setTargetLang(e.target.value as Language)}
                    className="mb-2 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
              {languageOptions}
            </select>
            <LanguageInput id="target-language" value={translatedText}
                           isLoading={isLoading} isReadOnly placeholder="A tradução aparecerá aqui..." />
          </div>
        </div>

        {/* Erro renderizado condicionalmente */}
        {renderError()}
      </main>

      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Desenvolvido com a API Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;
