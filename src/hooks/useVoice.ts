import { useState, useEffect, useCallback, useRef } from 'react';

export function useVoice(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceError(null);
        onTranscript(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission blocked by browser. You can still type or click Ask Nova!');
        } else {
          console.warn('Speech recognition status:', event.error);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization skipped:', err);
      setIsSupported(false);
    }
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setVoiceError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        setIsListening(false);
        if (e?.name === 'NotAllowedError' || e?.message?.includes('not-allowed')) {
          setVoiceError('Microphone permission blocked by browser.');
        }
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors if already stopped
      }
      setIsListening(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        // Clean markdown tags (#, *, $, _, `, etc.) so TTS doesn't utter strange symbols
        const cleanText = text
          .replace(/[#*$_\-`~=+|]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis warning:', e);
      }
    }
  }, []);

  return { isListening, isSupported, voiceError, startListening, stopListening, speak };
}
