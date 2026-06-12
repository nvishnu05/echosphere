import { useState, useEffect, useRef } from 'react';

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  setSelectedVoiceByName: (name: string) => void;
  speak: (text: string) => void;
  stop: () => void;
}

export const useTextToSpeech = (enabled: boolean = true): UseTextToSpeechReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        // Filter for English voices by default as secondary filter, but keep all
        const filteredVoices = availableVoices.sort((a, b) => {
          const aEng = a.lang.startsWith('en');
          const bEng = b.lang.startsWith('en');
          if (aEng && !bEng) return -1;
          if (!aEng && bEng) return 1;
          return a.name.localeCompare(b.name);
        });
        setVoices(filteredVoices);

        // Load preferred voice from localStorage or select the first English/system default voice
        const cachedVoice = localStorage.getItem('tts-voice-name');
        if (cachedVoice && availableVoices.some(v => v.name === cachedVoice)) {
          setSelectedVoiceName(cachedVoice);
        } else {
          const defaultVoice = filteredVoices.find(v => v.default) || filteredVoices.find(v => v.lang.startsWith('en')) || filteredVoices[0];
          if (defaultVoice) {
            setSelectedVoiceName(defaultVoice.name);
          }
        }
      };

      loadVoices();
      
      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const setSelectedVoiceByName = (name: string) => {
    setSelectedVoiceName(name);
    localStorage.setItem('tts-voice-name', name);
  };

  const cleanTextForSpeech = (text: string): string => {
    // Strip markdown formatting symbols that sound weird when spoken aloud
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold **text** -> text
      .replace(/\*([^*]+)\*/g, '$1')     // Italic *text* -> text
      .replace(/`([^`]+)`/g, '$1')       // Inline code `code` -> code
      .replace(/#[#\s]*([^\n]+)/g, '$1') // Headers # title -> title
      .replace(/-\s+/g, '')               // List markers "- item" -> "item"
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links [text](url) -> text
      .replace(/[*_`#]/g, '')            // Leftover special chars
      .trim();
  };

  const speak = (text: string) => {
    if (!supported || !enabled) return;

    // Stop current speech before playing new one
    stop();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    // Find and set the selected voice
    if (selectedVoiceName) {
      const activeVoice = voices.find(v => v.name === selectedVoiceName);
      if (activeVoice) {
        utterance.voice = activeVoice;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (supported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [supported]);

  return {
    isSpeaking,
    supported,
    voices,
    selectedVoiceName,
    setSelectedVoiceByName,
    speak,
    stop
  };
};
