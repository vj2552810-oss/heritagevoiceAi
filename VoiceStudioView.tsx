"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Upload,
  Play,
  Sparkles,
  CheckCircle2,
  ArrowDown,
  Save,
  Volume2,
  FileAudio,
  Wand2,
  Loader2,
  Globe,
  Tag,
  BookOpen,
} from "lucide-react";
import type { VoiceAnalysisResult } from "@/lib/ai";
import { getAuthHeaders } from "@/lib/client-auth";
import AudioPronouncer from "./AudioPronouncer";

interface VoiceStudioViewProps {
  userRegion?: string;
  onSavedToArchive: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

// Helper to generate a clean acoustic chime/drone WAV data URL for demo presets so original audio is always playable
function createPresetWavDataUrl(freq = 220): string {
  const sampleRate = 8000;
  const durationSeconds = 2.5;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 0.9) * Math.sin(Math.PI * (t / durationSeconds));
    const wave =
      Math.sin(2 * Math.PI * freq * t) * 0.5 +
      Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.3 +
      Math.sin(2 * Math.PI * (freq * 2) * t) * 0.2;
    const sample = Math.max(-1, Math.min(1, wave * envelope));
    view.setInt16(44 + i * 2, sample * 16383, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export default function VoiceStudioView({
  userRegion = "Konkan & Sahyadri",
  onSavedToArchive,
  showToast,
}: VoiceStudioViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>("");
  const [uploadedServerUrl, setUploadedServerUrl] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState(userRegion);
  const [selectedDialect, setSelectedDialect] = useState("Malvani / Konkani");
  const [recordingTitle, setRecordingTitle] = useState("");
  const [manualTranscriptHint, setManualTranscriptHint] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("konkan_water");

  // Pipeline stages: 0 = idle, 1 = audio ready, 2 = speech-to-text, 3 = transcript ready, 4 = AI analysis complete
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<VoiceAnalysisResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Draw live waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 48;
      const barWidth = (canvas.width - bars * 3) / bars;
      const centerY = canvas.height / 2;

      for (let i = 0; i < bars; i++) {
        const activeAmp = isRecording
          ? Math.abs(Math.sin(phase + i * 0.35)) * 28 +
            Math.abs(Math.cos(phase * 1.4 - i * 0.2)) * 14 +
            6
          : audioPreviewUrl
          ? Math.abs(Math.sin(i * 0.45)) * 18 + 6
          : 5;

        ctx.fillStyle = isRecording
          ? "#B84A27"
          : audioPreviewUrl
          ? "#2C5E4F"
          : "#D8CFC0";

        const x = i * (barWidth + 3);
        const y = centerY - activeAmp / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, activeAmp, 3);
        ctx.fill();
      }
      phase += 0.12;
      if (isRecording) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, audioPreviewUrl]);

  const startMicrophoneRecording = async () => {
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        showToast(
          "Browser microphone API unavailable in this environment. Loaded simulated field audio buffer instead!",
          "info"
        );
        loadSampleVoiceRecording("konkan_water");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const localUrl = URL.createObjectURL(blob);
        setAudioPreviewUrl(localUrl);
        setPipelineStep(1);
        await uploadAudioBlobToServer(blob, "mic-recording.webm");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setAnalysisResult(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      showToast(
        "Microphone permission denied or hardware unavailable. Using field studio audio buffer so you can test the full pipeline!",
        "info"
      );
      loadSampleVoiceRecording(selectedPreset || "konkan_water");
    }
  };

  const stopMicrophoneRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const uploadAudioBlobToServer = async (blob: Blob, filename: string) => {
    try {
      const formData = new FormData();
      const file = new File([blob], filename, {
        type: blob.type || "audio/webm",
      });
      formData.append("file", file);
      formData.append("mediaType", "audio");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setUploadedServerUrl(data.url);
      }
    } catch {
      // Keep local preview URL
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioBlob(file);
    const localUrl = URL.createObjectURL(file);
    setAudioPreviewUrl(localUrl);
    setRecordingTitle(file.name.replace(/\.[^/.]+$/, ""));
    setPipelineStep(1);
    setAnalysisResult(null);

    await uploadAudioBlobToServer(file, file.name);
    showToast(`Audio file "${file.name}" loaded and preserved.`, "success");
  };

  const loadSampleVoiceRecording = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const wavDataUrl =
      presetKey === "dharwad_harvest"
        ? createPresetWavDataUrl(260)
        : presetKey === "ahirani_proverb"
        ? createPresetWavDataUrl(196)
        : createPresetWavDataUrl(220);

    setAudioPreviewUrl(wavDataUrl);
    setUploadedServerUrl(wavDataUrl);
    setPipelineStep(1);
    setAnalysisResult(null);

    if (presetKey === "konkan_water") {
      setSelectedRegion("Konkan & Sahyadri");
      setSelectedDialect("Malvani / Konkani");
      setRecordingTitle("देवराईतला उंबराचा झरा (Sacred Grove Spring Testimony)");
      setManualTranscriptHint(
        "आमच्या गावच्या देवराईत उंबराच्या मुळाशी जो झरा आसा, तो उन्हाळ्यात सुद्धा कधी आटत नाय. जुने जाणते सांगतत की झाडं वाचवली तरच पाणी वाचतला."
      );
    } else if (presetKey === "dharwad_harvest") {
      setSelectedRegion("Dharwad & Uttara Kannada");
      setSelectedDialect("Janapada Kannada");
      setRecordingTitle("ಸುಗ್ಗಿ ಬಂತು ಅಣ್ಣಾ (Dharwad Sorghum Harvest Chant)");
      setManualTranscriptHint(
        "ಸುಗ್ಗಿ ಬಂತು ಅಣ್ಣಾ, ಹೊಲದಾಗ ಜೋಳದ ತೆನೆ ಮುತ್ತಿನಂಗೆ ತೂಗಾಡತೈತಿ. ಎತ್ತುಗಳಿಗೆ ಅರಿಶಿಣ ಕುಂಕುಮ ಹಚ್ಚಿ ಭೂಮಿ ತಾಯಿಗೆ ನಮಸ್ಕಾರ ಮಾಡೋಣ ಬಾ."
      );
    } else {
      setSelectedRegion("Khandesh & Deccan");
      setSelectedDialect("Ahirani");
      setRecordingTitle("पाणी जिरंल तं शिवार हिरवं राहील (Ahirani Proverb)");
      setManualTranscriptHint(
        "पाणी जिरंल तं शिवार हिरवं राहील, अन वडिलांची बोली टिकली तं गावची ओळख राहील."
      );
    }

    showToast(
      "Field voice recording loaded into studio. Click 'Run Speech-to-Text & AI Analysis' below.",
      "info"
    );
  };

  const runVoicePipeline = async () => {
    if (!audioPreviewUrl && !manualTranscriptHint.trim()) {
      showToast(
        "Please record audio, upload an audio file, or select a sample voice recording first.",
        "error"
      );
      return;
    }

    setAnalyzing(true);
    setPipelineStep(2); // Speech-to-Text stage

    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append("audio", audioBlob, "recording.webm");
      }
      formData.append("transcript", manualTranscriptHint);
      formData.append("presetKey", selectedPreset);
      formData.append("region", selectedRegion);
      formData.append("dialect", selectedDialect);

      // Step transition for visual clarity of the 4-stage pipeline
      setTimeout(() => setPipelineStep(3), 450);

      const res = await fetch("/api/ai", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.result) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysisResult(data.result);
      setPipelineStep(4);
      if (!recordingTitle.trim()) {
        setRecordingTitle(
          `${selectedDialect} Oral Recording — ${data.result.category}`
        );
      }
      showToast(
        "Speech-to-Text transcription and multilingual AI analysis completed!",
        "success"
      );
    } catch {
      showToast("Error running voice analysis pipeline.", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveRecordingToArchive = async () => {
    if (!analysisResult) {
      showToast("Please run the AI analysis pipeline before saving.", "error");
      return;
    }

    setSaving(true);
    try {
      const preservedAudio =
        uploadedServerUrl || audioPreviewUrl || createPresetWavDataUrl(220);

      const res = await fetch("/api/archive", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType: "story",
          title:
            recordingTitle.trim() ||
            `${selectedDialect} Voice Preservation (${selectedRegion})`,
          storyType: "Oral History",
          originalText: analysisResult.originalTranscript,
          standardTranslation: analysisResult.standardTranslation,
          englishTranslation: analysisResult.englishTranslation,
          marathiTranslation: analysisResult.marathiTranslation,
          kannadaTranslation: analysisResult.kannadaTranslation,
          hindiTranslation: analysisResult.hindiTranslation,
          aiSummary: analysisResult.summary,
          category: analysisResult.category,
          region: selectedRegion,
          keywords: analysisResult.keywords.join(", "),
          audioUrl: preservedAudio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save recording");
      }

      showToast(
        "Original voice recording & AI analysis saved to the archive (status: pending approval)!",
        "success"
      );
      onSavedToArchive();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save recording.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-8">
      {/* Studio Header Banner */}
      <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#B84A27]/15 text-[#B84A27] mb-3">
              <Mic className="w-3.5 h-3.5" />
              Acoustic & Ethnolinguistic Preservation Studio
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E1B18] font-serif-archival">
              Voice Preservation & Dialect Transcription Pipeline
            </h2>
            <p className="text-sm text-[#5C5449] mt-1 max-w-2xl">
              Record spoken folklore directly from your microphone or upload field
              recordings. Our pipeline preserves the original audio unaltered while
              generating speech-to-text transcripts, standard & English translations,
              summaries, and taxonomic keywords.
            </p>
          </div>

          {/* Quick Field Sample Loader */}
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3.5 shrink-0">
            <p className="text-xs font-semibold text-[#5C5449] uppercase tracking-wider mb-2">
              Load Sample Field Audio (No Mic Needed)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadSampleVoiceRecording("konkan_water")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedPreset === "konkan_water" && audioPreviewUrl
                    ? "bg-[#B84A27] text-white"
                    : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18]"
                }`}
              >
                Konkan Sacred Grove
              </button>
              <button
                type="button"
                onClick={() => loadSampleVoiceRecording("dharwad_harvest")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedPreset === "dharwad_harvest" && audioPreviewUrl
                    ? "bg-[#B84A27] text-white"
                    : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18]"
                }`}
              >
                Dharwad Harvest Chant
              </button>
              <button
                type="button"
                onClick={() => loadSampleVoiceRecording("ahirani_proverb")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedPreset === "ahirani_proverb" && audioPreviewUrl
                    ? "bg-[#B84A27] text-white"
                    : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18]"
                }`}
              >
                Ahirani Proverb
              </button>
            </div>
          </div>
        </div>

        {/* Visual Pipeline Stepper: Audio -> Speech-to-Text -> Original Transcript -> AI Analysis */}
        <div className="mt-6 pt-6 border-t border-[#E6DFD3] grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              step: 1,
              title: "1. Audio Capture",
              desc: "Record mic or upload audio",
            },
            {
              step: 2,
              title: "2. Speech-to-Text",
              desc: "Acoustic phoneme decoding",
            },
            {
              step: 3,
              title: "3. Original Transcript",
              desc: "Native script preservation",
            },
            {
              step: 4,
              title: "4. AI Analysis",
              desc: "Translation, summary & tags",
            },
          ].map((item) => {
            const active = pipelineStep >= item.step;
            return (
              <div
                key={item.step}
                className={`p-3.5 rounded-xl border transition-all ${
                  active
                    ? "bg-[#FBF9F5] border-[#B84A27] shadow-xs"
                    : "bg-[#FBF9F5]/50 border-[#E6DFD3] opacity-75"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      active ? "text-[#B84A27]" : "text-[#5C5449]"
                    }`}
                  >
                    {item.title}
                  </span>
                  {active && (
                    <CheckCircle2 className="w-4 h-4 text-[#1F7A4C]" />
                  )}
                </div>
                <p className="text-xs text-[#5C5449] mt-1">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Audio Recorder, Preview & Metadata */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
                Step 1: Record or Upload Voice
              </h3>
              <span className="font-mono-archival text-sm px-2.5 py-1 rounded bg-[#F3EFE6] text-[#1E1B18] border border-[#E6DFD3]">
                {isRecording ? (
                  <span className="text-[#B84A27] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#B84A27] animate-ping" />
                    REC {formatTimer(recordingSeconds)}
                  </span>
                ) : (
                  formatTimer(recordingSeconds)
                )}
              </span>
            </div>

            {/* Waveform Visualizer Canvas */}
            <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-xl p-4 flex flex-col items-center justify-center">
              <canvas
                ref={canvasRef}
                width={380}
                height={72}
                className="w-full h-18"
              />
              <p className="text-xs text-[#5C5449] mt-2 font-mono-archival">
                {isRecording
                  ? "Capturing live microphone audio stream..."
                  : audioPreviewUrl
                  ? "Original audio buffer preserved & ready for playback"
                  : "Ready to record from microphone or upload audio file"}
              </p>
            </div>

            {/* Record / Stop / Upload Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startMicrophoneRecording}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-sm shadow-xs transition cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  Record from Mic
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopMicrophoneRecording}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold text-sm shadow-xs transition cursor-pointer animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Recording
                </button>
              )}

              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18] border border-[#E6DFD3] font-semibold text-sm transition cursor-pointer">
                <Upload className="w-4 h-4 text-[#2C5E4F]" />
                <span>Upload Audio</span>
                <input
                  type="file"
                  accept="audio/*,.webm,.mp3,.wav,.ogg,.m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview Recording Box */}
            {audioPreviewUrl && (
              <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1B18] flex items-center gap-1.5">
                    <FileAudio className="w-4 h-4 text-[#2C5E4F]" />
                    Preview Preserved Original Recording
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#1F7A4C]/15 text-[#1F7A4C] font-medium">
                    Original Audio Intact
                  </span>
                </div>
                <audio
                  controls
                  src={audioPreviewUrl}
                  className="w-full h-9 mt-1"
                />
              </div>
            )}

            {/* Metadata & Dialect Context Inputs */}
            <div className="space-y-3 pt-2 border-t border-[#E6DFD3]">
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase tracking-wider mb-1">
                  Recording Title
                </label>
                <input
                  type="text"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder="e.g., Malvani Harvest Blessing / आजीची जुनी ओवी"
                  className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#D8CFC0] text-sm text-[#1E1B18] focus:outline-none focus:ring-2 focus:ring-[#B84A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase tracking-wider mb-1">
                    Region
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm text-[#1E1B18]"
                  >
                    <option value="Konkan & Sahyadri">Konkan & Sahyadri</option>
                    <option value="Sindhudurg (Konkan)">Sindhudurg (Konkan)</option>
                    <option value="Dharwad & Uttara Kannada">
                      Dharwad & Uttara Kannada
                    </option>
                    <option value="Western Ghats (Sahyadri)">
                      Western Ghats (Sahyadri)
                    </option>
                    <option value="Khandesh & Deccan">Khandesh & Deccan</option>
                    <option value="Goa & South Konkan">Goa & South Konkan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase tracking-wider mb-1">
                    Local Dialect
                  </label>
                  <select
                    value={selectedDialect}
                    onChange={(e) => setSelectedDialect(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm text-[#1E1B18]"
                  >
                    <option value="Malvani / Konkani">Malvani / Konkani</option>
                    <option value="Janapada Kannada">Janapada Kannada</option>
                    <option value="Ahirani">Ahirani</option>
                    <option value="Warli / Sahyadri">Warli / Sahyadri</option>
                    <option value="Havyaka / Tulu">Havyaka / Tulu</option>
                    <option value="Deccan Marathi">Deccan Marathi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase tracking-wider mb-1">
                  Spoken Dialect Transcript / Field Note (Optional Override)
                </label>
                <textarea
                  rows={3}
                  value={manualTranscriptHint}
                  onChange={(e) => setManualTranscriptHint(e.target.value)}
                  placeholder="Speak into the mic, load a sample above, or paste spoken regional dialect text here to analyze..."
                  className="w-full p-3 rounded-lg bg-white border border-[#D8CFC0] text-sm text-[#1E1B18] focus:outline-none focus:ring-2 focus:ring-[#B84A27]"
                />
              </div>

              <button
                type="button"
                onClick={runVoicePipeline}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#2C5E4F] hover:bg-[#22493D] text-white font-semibold text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running Speech-to-Text & AI Analysis...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Run Speech-to-Text & AI Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Vertical Pipeline Output (Audio -> Speech-to-Text -> Original Transcript -> AI Analysis) */}
        <div className="lg:col-span-7">
          {!analysisResult ? (
            <div className="h-full min-h-[420px] bg-[#F3EFE6]/70 border-2 border-dashed border-[#D8CFC0] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#B84A27]/10 text-[#B84A27] flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                AI Voice Analysis Output Awaits
              </h3>
              <p className="text-sm text-[#5C5449] max-w-md mt-2">
                Record your voice, upload an audio file, or click one of the
                sample field recordings above, then press{" "}
                <strong className="text-[#1E1B18]">
                  &ldquo;Run Speech-to-Text & AI Analysis&rdquo;
                </strong>{" "}
                to inspect the transcript, translations, summary, category, and
                keywords.
              </p>
              <button
                type="button"
                onClick={() => {
                  loadSampleVoiceRecording("konkan_water");
                }}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B84A27] text-white text-xs font-semibold hover:bg-[#9E3C1E] transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Load Demo Recording & Try Now
              </button>
            </div>
          ) : (
            <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl p-6 shadow-xs space-y-5">
              {/* Pipeline Flow Visual Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E6DFD3]">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#1F7A4C]/15 text-[#1F7A4C] text-xs font-semibold">
                    Pipeline Complete
                  </span>
                  <span className="text-xs font-mono-archival text-[#5C5449]">
                    Audio → Speech-to-Text → Original Transcript → AI Analysis
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3EFE6] border border-[#E6DFD3] text-[#5C5449] font-mono-archival">
                  Engine:{" "}
                  {analysisResult.mode === "groq-live"
                    ? "Groq Whisper + Llama 3.3"
                    : "Archival Demo Engine"}
                </span>
              </div>

              {/* Stage 1 & 2: Original Transcript + Preserved Audio */}
              <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B84A27] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4" />
                    Original Dialect Transcript (Preserved Unaltered)
                  </span>
                  <AudioPronouncer
                    audioUrl={uploadedServerUrl || audioPreviewUrl}
                    textToSpeak={analysisResult.originalTranscript}
                    label="Play Original + Cadence"
                    compact
                  />
                </div>
                <p className="text-lg font-medium text-[#1E1B18] leading-relaxed">
                  &ldquo;{analysisResult.originalTranscript}&rdquo;
                </p>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-[#B84A27]" />
              </div>

              {/* Stage 3: Standard Language & English Translations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2C5E4F] flex items-center gap-1.5 mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    Standard Language Translation
                  </span>
                  <p className="text-sm text-[#1E1B18] leading-relaxed">
                    {analysisResult.standardTranslation}
                  </p>
                </div>

                <div className="bg-white border border-[#E6DFD3] rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B84A27] flex items-center gap-1.5 mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    English Translation
                  </span>
                  <p className="text-sm text-[#1E1B18] leading-relaxed">
                    {analysisResult.englishTranslation}
                  </p>
                </div>
              </div>

              {/* Multi-Language Additional Renderings (Marathi / Kannada / Hindi) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#F3EFE6]/60 border border-[#E6DFD3] rounded-xl p-3.5 text-xs">
                <div>
                  <span className="font-bold text-[#5C5449] block mb-1">
                    मराठी (Marathi):
                  </span>
                  <p className="text-[#1E1B18]">
                    {analysisResult.marathiTranslation}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-[#5C5449] block mb-1">
                    ಕನ್ನಡ (Kannada):
                  </span>
                  <p className="text-[#1E1B18]">
                    {analysisResult.kannadaTranslation}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-[#5C5449] block mb-1">
                    हिन्दी (Hindi):
                  </span>
                  <p className="text-[#1E1B18]">
                    {analysisResult.hindiTranslation}
                  </p>
                </div>
              </div>

              {/* Stage 4: Short Summary, Detected Category, Important Keywords */}
              <div className="bg-white border border-[#E6DFD3] rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B18] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#B84A27]" />
                    AI Cultural Summary
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#2C5E4F]/15 text-[#2C5E4F]">
                    Detected Category: {analysisResult.category}
                  </span>
                </div>
                <p className="text-sm text-[#5C5449] leading-relaxed">
                  {analysisResult.summary}
                </p>

                <div className="pt-2 border-t border-[#E6DFD3]">
                  <span className="text-xs font-semibold text-[#5C5449] flex items-center gap-1 mb-2">
                    <Tag className="w-3.5 h-3.5 text-[#B84A27]" />
                    Important Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-[#F3EFE6] border border-[#E6DFD3] text-xs font-medium text-[#1E1B18]"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Recording Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-[#5C5449]">
                  Original audio & transcript will be permanently stored in the
                  archive.
                </p>
                <button
                  type="button"
                  onClick={handleSaveRecordingToArchive}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Archive...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Recording to Archive</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
