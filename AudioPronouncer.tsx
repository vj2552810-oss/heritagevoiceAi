"use client";

import React, { useRef, useState } from "react";
import { Volume2, Square, Sparkles } from "lucide-react";

interface AudioPronouncerProps {
  audioUrl?: string | null;
  textToSpeak: string;
  langHint?: string;
  label?: string;
  compact?: boolean;
}

export default function AudioPronouncer({
  audioUrl,
  textToSpeak,
  langHint = "mr-IN",
  label = "Listen",
  compact = false,
}: AudioPronouncerProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  };

  const handlePlay = () => {
    if (playing) {
      handleStop();
      return;
    }

    if (audioUrl && audioUrl.trim().length > 0) {
      try {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setPlaying(true);
        audio.onended = () => setPlaying(false);
        audio.onerror = () => {
          setPlaying(false);
          speakWithSynthesis();
        };
        audio.play().catch(() => {
          speakWithSynthesis();
        });
        return;
      } catch {
        // Fallback to speechSynthesis
      }
    }

    speakWithSynthesis();
  };

  const speakWithSynthesis = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langHint;
    utterance.rate = 0.9;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      title={
        audioUrl
          ? "Play preserved archival audio"
          : "Listen to pronunciation cadence"
      }
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all cursor-pointer ${
        playing
          ? "bg-[#B84A27] text-white shadow-sm"
          : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18] border border-[#E6DFD3]"
      } ${compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-xs"}`}
    >
      {playing ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop Audio</span>
          <span className="flex items-end gap-0.5 h-3 ml-1">
            <span className="w-0.5 h-3 bg-white animate-pulse" />
            <span className="w-0.5 h-2 bg-white animate-pulse" />
            <span className="w-0.5 h-3 bg-white animate-pulse" />
          </span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-[#B84A27]" />
          <span>{label}</span>
          {audioUrl ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2C5E4F]/15 text-[#2C5E4F] font-mono-archival">
              Original Audio
            </span>
          ) : (
            <Sparkles className="w-3 h-3 text-[#5C5449]" />
          )}
        </>
      )}
    </button>
  );
}
