import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface LanguageInputProps {
  id: string;
  label?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClear?: () => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

const LanguageInput: React.FC<LanguageInputProps> = ({
  id,
  label,
  value,
  onChange,
  onClear,
  isReadOnly = false,
  isLoading = false,
  placeholder,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col w-full">
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-400 mb-2">{label}</label>}
      <div className="relative flex-1 flex flex-col">
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          readOnly={isReadOnly}
          placeholder={placeholder}
          className="w-full h-48 md:h-64 p-4 pr-10 bg-gray-900 border border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 text-gray-200 placeholder-gray-500"
        />
        <div className="absolute top-3 right-3 flex flex-col gap-2">
            {value && !isReadOnly && onClear && (
                <button onClick={onClear} className="text-gray-500 hover:text-white transition-colors" title="Limpar texto">
                    <XCircleIcon />
                </button>
            )}
            {value && isReadOnly && (
                 <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors" title="Copiar texto">
                    {copied ? <ClipboardCheckIcon /> : <ClipboardIcon />}
                 </button>
            )}
        </div>
        {isLoading && (
            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center rounded-lg">
                <LoaderIcon />
            </div>
        )}
        <div className="text-right text-xs text-gray-500 mt-2 pr-1">
          {value.length} caracteres
        </div>
      </div>
    </div>
  );
};

export default LanguageInput;