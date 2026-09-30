"use client";

import React, { useState } from "react";
import {
  Feather,
  Plus,
  Sparkles,
  Languages,
  MapPin,
  Tag,
  User as UserIcon,
  Wand2,
  Loader2,
  Upload,
  X,
  Clock,
  ArrowRightLeft,
} from "lucide-react";
import type { FolkStory } from "@/db/schema";
import type { TranslationResult } from "@/lib/ai";
import { getAuthHeaders } from "@/lib/client-auth";
import AudioPronouncer from "./AudioPronouncer";

interface FolkStoryViewProps {
  stories: FolkStory[];
  myStories: FolkStory[];
  onSubmitted: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  initialSubTab?: "stories" | "translator";
}

const STORY_TYPES = [
  "All",
  "Folk Story",
  "Village Legend",
  "Traditional Story",
  "Proverb",
  "Traditional Song",
  "Oral History",
];

export default function FolkStoryView({
  stories,
  myStories,
  onSubmitted,
  showToast,
  initialSubTab = "stories",
}: FolkStoryViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"stories" | "translator">(
    initialSubTab
  );
  const [selectedType, setSelectedType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLangByStory, setActiveLangByStory] = useState<
    Record<number, string>
  >({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Story submission form states
  const [title, setTitle] = useState("");
  const [storyType, setStoryType] = useState("Folk Story");
  const [region, setRegion] = useState("Konkan & Sahyadri");
  const [originalText, setOriginalText] = useState("");
  const [standardTranslation, setStandardTranslation] = useState("");
  const [englishTranslation, setEnglishTranslation] = useState("");
  const [marathiTranslation, setMarathiTranslation] = useState("");
  const [kannadaTranslation, setKannadaTranslation] = useState("");
  const [hindiTranslation, setHindiTranslation] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [category, setCategory] = useState("Farming & Harvest");
  const [keywords, setKeywords] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Standalone Translator Studio states
  const [translatorInput, setTranslatorInput] = useState(
    "आमच्या गावच्या देवराईतलं पाणी आणि जुन्या लोकांची बोली कधी आटूक नको."
  );
  const [translatorSourceLang, setTranslatorSourceLang] = useState(
    "Local Dialect (Malvani / Konkani)"
  );
  const [translatorRegion, setTranslatorRegion] = useState(
    "Konkan & Sahyadri"
  );
  const [translating, setTranslating] = useState(false);
  const [translationOutput, setTranslationOutput] =
    useState<TranslationResult | null>(null);

  const filteredStories = stories.filter((s) => {
    const matchesType =
      selectedType === "All" || s.storyType === selectedType;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.originalText.toLowerCase().includes(q) ||
      s.englishTranslation.toLowerCase().includes(q) ||
      s.aiSummary.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q) ||
      s.keywords.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const myPendingStories = myStories.filter((s) => s.status === "pending");

  const handleAutoGenerateWithAI = async () => {
    if (!originalText.trim()) {
      showToast(
        "Please enter the original dialect story, song, or proverb text first.",
        "error"
      );
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "story-analyze",
          originalText,
          region,
          dialect: storyType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(data.error || "AI generation failed");
      }

      const r = data.result;
      setStandardTranslation(r.standardTranslation || "");
      setEnglishTranslation(r.englishTranslation || "");
      setMarathiTranslation(r.marathiTranslation || "");
      setKannadaTranslation(r.kannadaTranslation || "");
      setHindiTranslation(r.hindiTranslation || "");
      setAiSummary(r.summary || "");
      setCategory(r.category || "Ancestral Wisdom");
      setKeywords(
        Array.isArray(r.keywords) ? r.keywords.join(", ") : r.keywords || ""
      );

      showToast(
        "AI automatically generated translations, summary, category, and keywords!",
        "success"
      );
    } catch {
      showToast("Failed to run AI auto-generation.", "error");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", "audio");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAudioUrl(data.url);
        showToast("Original audio file attached and preserved.", "success");
      }
    } catch {
      showToast("Audio upload failed.", "error");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !originalText.trim()) {
      showToast("Title and original dialect text are required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      // If user hasn't clicked Auto-Generate with AI yet, run it automatically so summary/category/keywords are populated
      let finalSummary = aiSummary;
      let finalCategory = category;
      let finalKeywords = keywords;
      let finalStd = standardTranslation;
      let finalEng = englishTranslation;
      let finalMar = marathiTranslation;
      let finalKan = kannadaTranslation;
      let finalHin = hindiTranslation;

      if (!finalSummary.trim() || !finalEng.trim()) {
        const aiRes = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "story-analyze",
            originalText,
            region,
            dialect: storyType,
          }),
        });
        const aiData = await aiRes.json();
        if (aiRes.ok && aiData.result) {
          finalSummary = finalSummary || aiData.result.summary;
          finalCategory = finalCategory || aiData.result.category;
          finalKeywords =
            finalKeywords ||
            (Array.isArray(aiData.result.keywords)
              ? aiData.result.keywords.join(", ")
              : "Folklore, Oral History");
          finalStd = finalStd || aiData.result.standardTranslation;
          finalEng = finalEng || aiData.result.englishTranslation;
          finalMar = finalMar || aiData.result.marathiTranslation;
          finalKan = finalKan || aiData.result.kannadaTranslation;
          finalHin = finalHin || aiData.result.hindiTranslation;
        }
      }

      const res = await fetch("/api/archive", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType: "story",
          title,
          storyType,
          originalText,
          standardTranslation: finalStd || originalText,
          englishTranslation: finalEng || originalText,
          marathiTranslation: finalMar,
          kannadaTranslation: finalKan,
          hindiTranslation: finalHin,
          aiSummary: finalSummary,
          category: finalCategory,
          region,
          keywords: finalKeywords,
          audioUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      showToast(
        `${storyType} submitted with status = "pending" for administrator review!`,
        "success"
      );
      setTitle("");
      setOriginalText("");
      setStandardTranslation("");
      setEnglishTranslation("");
      setAiSummary("");
      setKeywords("");
      setAudioUrl("");
      setShowSubmitModal(false);
      onSubmitted();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to submit story",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunTranslation = async () => {
    if (!translatorInput.trim()) {
      showToast("Please enter dialect or regional text to translate.", "error");
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "translate",
          text: translatorInput,
          sourceLanguage: translatorSourceLang,
          region: translatorRegion,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(data.error || "Translation failed");
      }
      setTranslationOutput(data.result);
      showToast(
        "Translated across Local Dialect, Marathi, Kannada, Hindi, and English while preserving original text!",
        "success"
      );
    } catch {
      showToast("Error running translation engine.", "error");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#B84A27]/15 text-[#B84A27] mb-2">
            <Feather className="w-3.5 h-3.5" />
            Oral Literature & Multilingual Preservation
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E1B18] font-serif-archival">
            Folk Story Preservation & Dialect Translator
          </h2>
          <p className="text-sm text-[#5C5449] mt-1">
            Preserve folk stories, village legends, traditional stories,
            proverbs, traditional songs, and oral history with AI summaries and
            5-language translation (Local Dialect, Marathi, Kannada, Hindi,
            English).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex rounded-xl bg-[#FBF9F5] p-1 border border-[#E6DFD3]">
            <button
              type="button"
              onClick={() => setActiveSubTab("stories")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubTab === "stories"
                  ? "bg-[#1E1B18] text-white"
                  : "text-[#5C5449] hover:text-[#1E1B18]"
              }`}
            >
              Stories & Songs ({stories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("translator")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "translator"
                  ? "bg-[#2C5E4F] text-white"
                  : "text-[#5C5449] hover:text-[#1E1B18]"
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              5-Language Translator
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Submit Story / Song / Proverb
          </button>
        </div>
      </div>

      {/* Sub-Tab 2: Dedicated 5-Language Dialect Translation Studio */}
      {activeSubTab === "translator" ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#E6DFD3]">
            <div>
              <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#2C5E4F]" />
                Multi-Language Cultural Translation Studio
              </h3>
              <p className="text-xs text-[#5C5449] mt-0.5">
                Translate seamlessly between Local Dialect, Marathi, Kannada,
                Hindi, and English. Original dialect text and audio are strictly
                preserved and never overwritten.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setTranslatorInput(
                    "आमच्या गावच्या देवराईतलं पाणी आणि जुन्या लोकांची बोली कधी आटूक नको."
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] text-xs font-medium text-[#1E1B18] cursor-pointer"
              >
                Sample: Konkani Devrai Blessing
              </button>
              <button
                type="button"
                onClick={() =>
                  setTranslatorInput(
                    "ಮಳೆ ಬಂದಾಗ ಕೆರೆ ತುಂಬುವುದು, ಬೆಳೆ ಬಂದಾಗ ಮನೆ ತುಂಬುವುದು."
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] text-xs font-medium text-[#1E1B18] cursor-pointer"
              >
                Sample: Dharwad Proverb
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Source Language
                  </label>
                  <select
                    value={translatorSourceLang}
                    onChange={(e) => setTranslatorSourceLang(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#FBF9F5] border border-[#D8CFC0] text-xs font-medium"
                  >
                    <option value="Local Dialect (Malvani / Konkani)">
                      Local Dialect (Malvani / Konkani)
                    </option>
                    <option value="Local Dialect (Janapada / Havyaka)">
                      Local Dialect (Janapada / Havyaka)
                    </option>
                    <option value="Local Dialect (Ahirani)">
                      Local Dialect (Ahirani)
                    </option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Cultural Region
                  </label>
                  <input
                    type="text"
                    value={translatorRegion}
                    onChange={(e) => setTranslatorRegion(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#FBF9F5] border border-[#D8CFC0] text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#5C5449] uppercase">
                    Original Dialect / Source Text (Never Overwritten)
                  </label>
                  <AudioPronouncer
                    textToSpeak={translatorInput}
                    label="Listen Original"
                    compact
                  />
                </div>
                <textarea
                  rows={5}
                  value={translatorInput}
                  onChange={(e) => setTranslatorInput(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#FBF9F5] border border-[#D8CFC0] text-sm text-[#1E1B18] focus:outline-none focus:ring-2 focus:ring-[#2C5E4F]"
                />
              </div>

              <button
                type="button"
                onClick={handleRunTranslation}
                disabled={translating}
                className="w-full py-3 px-4 rounded-xl bg-[#2C5E4F] hover:bg-[#22493D] text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Translating Across 5 Languages...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Translate to Local Dialect, Marathi, Kannada, Hindi &
                      English
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-7">
              {!translationOutput ? (
                <div className="h-full min-h-[280px] bg-[#F3EFE6]/60 border border-dashed border-[#D8CFC0] rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <Languages className="w-10 h-10 text-[#2C5E4F] mb-2 opacity-70" />
                  <h4 className="text-base font-bold text-[#1E1B18] font-serif-archival">
                    5-Language Parallel Output
                  </h4>
                  <p className="text-xs text-[#5C5449] max-w-md mt-1">
                    Click the translate button to view side-by-side renderings in
                    Local Dialect, Marathi, Kannada, Hindi, and English while
                    keeping the original text intact.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-xl p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#B84A27] block">
                      Preserved Original Text ({translationOutput.sourceLanguage}):
                    </span>
                    <p className="text-sm font-semibold text-[#1E1B18] mt-1">
                      &ldquo;{translationOutput.originalText}&rdquo;
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3.5">
                      <span className="text-xs font-bold text-[#B84A27] block mb-1">
                        1. Local Dialect (स्थानिक बोली):
                      </span>
                      <p className="text-sm text-[#1E1B18]">
                        {translationOutput.translations.localDialect}
                      </p>
                    </div>
                    <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3.5">
                      <span className="text-xs font-bold text-[#2C5E4F] block mb-1">
                        2. Marathi (मराठी):
                      </span>
                      <p className="text-sm text-[#1E1B18]">
                        {translationOutput.translations.marathi}
                      </p>
                    </div>
                    <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3.5">
                      <span className="text-xs font-bold text-[#2C5E4F] block mb-1">
                        3. Kannada (ಕನ್ನಡ):
                      </span>
                      <p className="text-sm text-[#1E1B18]">
                        {translationOutput.translations.kannada}
                      </p>
                    </div>
                    <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3.5">
                      <span className="text-xs font-bold text-[#2C5E4F] block mb-1">
                        4. Hindi (हिन्दी):
                      </span>
                      <p className="text-sm text-[#1E1B18]">
                        {translationOutput.translations.hindi}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3.5">
                    <span className="text-xs font-bold text-[#1E1B18] block mb-1">
                      5. English Translation:
                    </span>
                    <p className="text-sm text-[#1E1B18]">
                      {translationOutput.translations.english}
                    </p>
                  </div>

                  <div className="bg-[#F3EFE6]/60 border border-[#E6DFD3] rounded-xl p-3 text-xs text-[#5C5449] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-mono-archival">
                      {translationOutput.phoneticNotes}
                    </span>
                    <span>{translationOutput.culturalContext}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Pending User Submissions Alert */}
          {myPendingStories.length > 0 && (
            <div className="bg-[#C87A19]/10 border border-[#C87A19]/40 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#C87A19] shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-[#1E1B18]">
                    Your Pending Oral Literature Submissions ({myPendingStories.length})
                  </h4>
                  <p className="text-xs text-[#5C5449]">
                    {myPendingStories.map((s) => s.title).join(" • ")} —
                    Awaiting curator approval.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono-archival px-2.5 py-1 rounded bg-[#C87A19]/20 text-[#9A5B0D] font-semibold">
                status = &quot;pending&quot;
              </span>
            </div>
          )}

          {/* Filter Pills & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STORY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedType === t
                      ? "bg-[#B84A27] text-white"
                      : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories, proverbs, songs, keywords..."
              className="h-10 px-3.5 rounded-xl bg-white border border-[#D8CFC0] text-xs w-full md:w-72"
            />
          </div>

          {/* Stories Cards */}
          <div className="space-y-5">
            {filteredStories.map((story) => {
              const selectedLang = activeLangByStory[story.id] || "english";
              const keywordsList = story.keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean);

              return (
                <div
                  key={story.id}
                  className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs space-y-4"
                >
                  {/* Top Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#B84A27]/15 text-[#B84A27] text-xs font-bold">
                        {story.storyType}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#2C5E4F]/15 text-[#2C5E4F] text-xs font-semibold">
                        Category: {story.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-[#5C5449] bg-[#F3EFE6] px-2.5 py-1 rounded-md">
                        <MapPin className="w-3.5 h-3.5 text-[#B84A27]" />
                        {story.region}
                      </span>
                    </div>

                    {story.isSample && (
                      <span className="text-[10px] font-mono-archival uppercase tracking-wider px-2 py-0.5 rounded bg-[#F3EFE6] border border-[#D8CFC0] text-[#5C5449]">
                        [SAMPLE / DEMO ARCHIVE ENTRY]
                      </span>
                    )}
                  </div>

                  {/* Title & Audio */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-xl md:text-2xl font-bold text-[#1E1B18] font-serif-archival">
                      {story.title}
                    </h3>
                    <AudioPronouncer
                      audioUrl={story.audioUrl}
                      textToSpeak={story.originalText}
                      label="Play Oral Recording"
                    />
                  </div>

                  {/* Side-by-Side Original Dialect vs Multi-Language Translation */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                    {/* Original Text (Preserved Unaltered) */}
                    <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#B84A27]">
                          Original Dialect Text (Preserved)
                        </span>
                        <span className="text-[11px] font-mono-archival text-[#5C5449]">
                          Unaltered Source
                        </span>
                      </div>
                      <p className="text-base text-[#1E1B18] leading-relaxed font-medium">
                        &ldquo;{story.originalText}&rdquo;
                      </p>
                    </div>

                    {/* Multi-Language Translation Switcher */}
                    <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-4 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#2C5E4F] flex items-center gap-1">
                          <Languages className="w-3.5 h-3.5" />
                          Translation View
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: "english", label: "English" },
                            { id: "standard", label: "Standard" },
                            { id: "marathi", label: "Marathi" },
                            { id: "kannada", label: "Kannada" },
                            { id: "hindi", label: "Hindi" },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() =>
                                setActiveLangByStory((prev) => ({
                                  ...prev,
                                  [story.id]: tab.id,
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                                selectedLang === tab.id
                                  ? "bg-[#2C5E4F] text-white"
                                  : "bg-[#F3EFE6] text-[#5C5449] hover:text-[#1E1B18]"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-sm text-[#1E1B18] leading-relaxed">
                        {selectedLang === "english" && story.englishTranslation}
                        {selectedLang === "standard" &&
                          story.standardTranslation}
                        {selectedLang === "marathi" &&
                          (story.marathiTranslation ||
                            story.standardTranslation)}
                        {selectedLang === "kannada" &&
                          (story.kannadaTranslation ||
                            story.standardTranslation)}
                        {selectedLang === "hindi" &&
                          (story.hindiTranslation || story.standardTranslation)}
                      </p>
                    </div>
                  </div>

                  {/* AI Summary & Keywords */}
                  <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#5C5449] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#B84A27]" />
                        AI Generated Archival Summary
                      </span>
                      <p className="text-sm text-[#1E1B18]">{story.aiSummary}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {keywordsList.map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F3EFE6] text-xs font-medium text-[#5C5449]"
                        >
                          <Tag className="w-3 h-3 text-[#B84A27]" />
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-[#F3EFE6] flex items-center justify-between text-xs text-[#5C5449]">
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" />
                      Contributor:{" "}
                      <strong className="text-[#1E1B18]">
                        {story.contributorName}
                      </strong>
                    </span>
                    <span>
                      Preserved:{" "}
                      {new Date(story.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Submit Folk Story / Song / Proverb Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                  Preserve Folk Story, Proverb, Song, or Oral History
                </h3>
                <p className="text-xs text-[#5C5449]">
                  Use the AI button below to automatically generate the summary,
                  category, keywords, and translations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F3EFE6] text-[#5C5449] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., आजीची सुगीची ओवी / Village Harvest Legend"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Submission Type *
                  </label>
                  <select
                    value={storyType}
                    onChange={(e) => setStoryType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  >
                    <option value="Folk Story">Folk Story</option>
                    <option value="Village Legend">Village Legend</option>
                    <option value="Traditional Story">Traditional Story</option>
                    <option value="Proverb">Proverb</option>
                    <option value="Traditional Song">Traditional Song</option>
                    <option value="Oral History">Oral History</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Region *
                  </label>
                  <input
                    type="text"
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Audio Recording (Optional)
                  </label>
                  <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] border border-[#D8CFC0] text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#B84A27]" />
                    <span>
                      {uploadingAudio
                        ? "Uploading audio..."
                        : audioUrl
                        ? "Audio Attached ✓"
                        : "Upload Audio File"}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#5C5449] uppercase">
                    Original Dialect Text *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateWithAI}
                    disabled={aiGenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2C5E4F] hover:bg-[#22493D] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
                  >
                    {aiGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating with AI...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>
                          Auto-Generate Summary, Category & Keywords with AI
                        </span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="Enter the story, legend, proverb, or song in the original local dialect..."
                  className="w-full p-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Standard Language Translation
                  </label>
                  <textarea
                    rows={2}
                    value={standardTranslation}
                    onChange={(e) => setStandardTranslation(e.target.value)}
                    placeholder="Auto-filled by AI or enter Marathi/Kannada/Hindi translation..."
                    className="w-full p-2.5 rounded-lg bg-white border border-[#D8CFC0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    English Translation
                  </label>
                  <textarea
                    rows={2}
                    value={englishTranslation}
                    onChange={(e) => setEnglishTranslation(e.target.value)}
                    placeholder="Auto-filled by AI or enter English translation..."
                    className="w-full p-2.5 rounded-lg bg-white border border-[#D8CFC0] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  AI Summary (Auto-Generated)
                </label>
                <textarea
                  rows={2}
                  value={aiSummary}
                  onChange={(e) => setAiSummary(e.target.value)}
                  placeholder="AI summary will appear here..."
                  className="w-full p-2.5 rounded-lg bg-white border border-[#D8CFC0] text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    AI Detected Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    AI Keywords (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g., Harvest, Ovi, Konkan, Monsoon"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E6DFD3] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#F3EFE6] text-[#1E1B18] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit to Archive</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
