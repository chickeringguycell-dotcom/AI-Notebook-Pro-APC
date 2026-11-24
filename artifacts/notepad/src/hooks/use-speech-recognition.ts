import { useState, useEffect, useCallback, useRef } from "react";
import { stopAetherVoicePlayback } from "@/lib/sovereign-aether-runtime";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition({
  onResult,
  onEnd,
}: {
  onResult: (text: string) => void;
  onEnd?: () => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  onResultRef.current = onResult;
  onEndRef.current = onEnd;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    setIsSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onResultRef.current(finalTranscript);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      onEndRef.current?.();
    };

    rec.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("Speech recognition notice:", event.error);
      }
      setIsListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const startListening = useCallback(() => {
    stopAetherVoicePlayback();
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, isSupported, startListening, stopListening, toggleListening };
}
