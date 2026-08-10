import { useState, useEffect, useCallback, useRef } from 'react';

export type VoiceLanguage = 'en-GB' | 'hi-IN';

function pickVoice(lang: VoiceLanguage): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();

  if (lang === 'hi-IN') {
    // 1. Native Hindi voice (authentic Indian sound — not an Englishman faking it).
    const hindi = voices.find((v) => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
    if (hindi) return hindi;
    // 2. Indian-accented English voice.
    const enIn = voices.find((v) => v.lang === 'en-IN' || v.lang === 'en-IN-IND');
    if (enIn) return enIn;
  } else {
    // English (UK) mode
    const uk = voices.find((v) => v.lang === 'en-GB');
    if (uk) return uk;
    const en = voices.find((v) => v.lang === 'en-US');
    if (en) return en;
  }
  return voices.find((v) => v.lang === lang) || null;
}

export function useVoice(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('hi-IN');
  const recognitionRef = useRef<any>(null);
  const langRef = useRef<VoiceLanguage>('hi-IN');

  // Voice list can load asynchronously in some browsers.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = () => {
      // Prime the voice list; keep the current selection.
    };
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

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
      recognition.lang = langRef.current === 'hi-IN' ? 'hi-IN' : 'en-GB';

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

  const setVoiceLanguageMode = useCallback((lang: VoiceLanguage) => {
    setVoiceLanguage(lang);
    langRef.current = lang;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = lang === 'hi-IN' ? 'hi-IN' : 'en-GB';
      } catch (e) {
        // Ignore
      }
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

        const voice = pickVoice(langRef.current);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = langRef.current;
        }
        // Calm, clear teacher voice — slightly slower, natural pitch.
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis warning:', e);
      }
    }
  }, []);

  return {
    isListening,
    isSupported,
    voiceError,
    voiceLanguage,
    setVoiceLanguageMode,
    startListening,
    stopListening,
    speak,
  };
}
