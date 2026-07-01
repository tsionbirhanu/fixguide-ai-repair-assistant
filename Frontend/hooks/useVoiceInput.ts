"use client";

import { useState, useCallback } from "react";

interface SpeechResultEvent {
  results?: Array<Array<{ transcript?: string }>>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    setError(null);
    const win = typeof window !== "undefined" ? window : null;
    const SpeechRecognition =
      win &&
      (((win as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
        (win as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition) as
        | SpeechRecognitionConstructor
        | undefined);
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => {
      const ev = e as SpeechResultEvent;
      const transcript = ev.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setError("Could not recognize speech. Please try again.");
    };
    setRecognition(recognition);
    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    recognition?.stop();
    setIsListening(false);
    setError(null);
  }, [recognition]);

  return { isListening, error, startListening, stopListening };
}
