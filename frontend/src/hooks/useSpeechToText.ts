import { useState, useEffect, useRef } from 'react';

interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  browserSupportsSpeech: boolean;
}

export const useSpeechToText = (): UseSpeechToTextReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [browserSupportsSpeech, setBrowserSupportsSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setBrowserSupportsSpeech(true);
      const recognition = new SpeechRecognition();
      
      // Configuration
      recognition.continuous = true; // Keep listening until explicitly stopped
      recognition.interimResults = true; // Show results as they are spoken
      recognition.lang = 'en-US'; // Set language

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please update browser settings.');
        } else if (event.error === 'no-speech') {
          // Ignore no-speech errors to prevent user annoyance, or set a silent log
        } else {
          setError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setBrowserSupportsSpeech(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (!browserSupportsSpeech || !recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    
    try {
      setTranscript('');
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop speech recognition:', err);
      }
    }
    setIsListening(false);
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeech
  };
};
