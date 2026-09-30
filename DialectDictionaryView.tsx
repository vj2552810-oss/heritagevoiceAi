"use client";

import React, { useState } from "react";
import {
  BookA,
  Search,
  Plus,
  MapPin,
  User as UserIcon,
  Clock,
  CheckCircle2,
  Upload,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { DialectWord } from "@/db/schema";
import { getAuthHeaders } from "@/lib/client-auth";
import AudioPronouncer from "./AudioPronouncer";

interface DialectDictionaryViewProps {
  words: DialectWord[];
  myWords: DialectWord[];
  onSubmitted: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function DialectDictionaryView({
  words,
  myWords,
  onSubmitted,
  showToast,
}: DialectDictionaryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // New word form states
  const [localWord, setLocalWord] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [meaning, setMeaning] = useState("");
  const [standardLanguageMeaning, setStandardLanguageMeaning] = useState("");
  const [englishMeaning, setEnglishMeaning] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [region, setRegion] = useState("Konkan & Sahyadri");
  const [dialectName, setDialectName] = useState("Malvani / Konkani");
  const [audioUrl, setAudioUrl] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const regions = [
    "All",
    ...Array.from(new Set(words.map((w) => w.region))),
  ];

  const filteredWords = words.filter((w) => {
    const matchesRegion =
      selectedRegion === "All" || w.region === selectedRegion;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      w.localWord.toLowerCase().includes(q) ||
      w.pronunciation.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q) ||
      w.standardLanguageMeaning.toLowerCase().includes(q) ||
      w.englishMeaning.toLowerCase().includes(q) ||
      w.exampleSentence.toLowerCase().includes(q) ||
      w.region.toLowerCase().includes(q) ||
      w.dialectName.toLowerCase().includes(q);
    return matchesRegion && matchesSearch;
  });

  const myPendingWords = myWords.filter((w) => w.status === "pending");

  const handleAudioFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
        showToast("Pronunciation audio uploaded!", "success");
      } else {
        showToast(data.error || "Failed to upload audio", "error");
      }
    } catch {
      showToast("Error uploading audio file.", "error");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCreateWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localWord.trim() || !meaning.trim() || !englishMeaning.trim()) {
      showToast(
        "Please fill in the Local Word, Native Meaning, and English Meaning.",
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType: "word",
          localWord,
          pronunciation:
            pronunciation || `/${localWord.trim().toLowerCase()}/`,
          meaning,
          standardLanguageMeaning: standardLanguageMeaning || meaning,
          englishMeaning,
          exampleSentence:
            exampleSentence || `${localWord} — पारंपरिक प्रादेशिक वापर.`,
          region,
          dialectName,
          audioUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit word");
      }

      showToast(
        "Word submitted to lexicon with status 'pending'! Admin approval will make it publicly visible.",
        "success"
      );
      setLocalWord("");
      setPronunciation("");
      setMeaning("");
      setStandardLanguageMeaning("");
      setEnglishMeaning("");
      setExampleSentence("");
      setAudioUrl("");
      setShowSubmitModal(false);
      onSubmitted();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Submission failed",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#2C5E4F]/15 text-[#2C5E4F] mb-2">
            <BookA className="w-3.5 h-3.5" />
            Living Regional Lexicon
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E1B18] font-serif-archival">
            Searchable Dialect Dictionary
          </h2>
          <p className="text-sm text-[#5C5449] mt-1">
            Explore indigenous vocabulary with IPA phonetic transcription,
            native meanings, Marathi/Kannada/Hindi standard equivalents, English
            definitions, and audio pronunciation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSubmitModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-sm shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Submit Dialect Word
        </button>
      </div>

      {/* User's Pending Words Notice */}
      {myPendingWords.length > 0 && (
        <div className="bg-[#C87A19]/10 border border-[#C87A19]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#C87A19] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-[#1E1B18]">
                Your Pending Lexicon Submissions ({myPendingWords.length})
              </h4>
              <p className="text-xs text-[#5C5449]">
                Submitted words: {myPendingWords.map((w) => w.localWord).join(", ")} — Awaiting administrator verification before appearing in the public dictionary.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-archival px-2.5 py-1 rounded bg-[#C87A19]/20 text-[#9A5B0D] font-semibold shrink-0">
            status = &quot;pending&quot;
          </span>
        </div>
      )}

      {/* Search & Region Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5C5449] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by local word, English meaning, Marathi/Kannada meaning, or region..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-[#D8CFC0] text-sm text-[#1E1B18] focus:outline-none focus:ring-2 focus:ring-[#B84A27]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {regions.map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => setSelectedRegion(reg)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedRegion === reg
                  ? "bg-[#1E1B18] text-white"
                  : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#5C5449]"
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      {/* Dictionary Grid */}
      {filteredWords.length === 0 ? (
        <div className="bg-[#F3EFE6]/60 border border-[#E6DFD3] rounded-2xl p-12 text-center">
          <BookA className="w-10 h-10 text-[#5C5449] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
            No matching dialect words found
          </h3>
          <p className="text-sm text-[#5C5449] mt-1">
            Try clearing your search filter or contribute this word to the
            community dictionary.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredWords.map((word) => (
            <div
              key={word.id}
              className="bg-white border border-[#E6DFD3] hover:border-[#C9BFA9] rounded-2xl p-6 shadow-xs transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Top Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F3EFE6] text-[#1E1B18] text-xs font-semibold">
                      <MapPin className="w-3 h-3 text-[#B84A27]" />
                      {word.region}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-[#2C5E4F]/10 text-[#2C5E4F] font-medium">
                      {word.dialectName}
                    </span>
                  </div>
                  {word.isSample && (
                    <span className="text-[10px] font-mono-archival uppercase tracking-wider px-2 py-0.5 rounded bg-[#F3EFE6] border border-[#D8CFC0] text-[#5C5449]">
                      [SAMPLE / DEMO ARCHIVE ENTRY]
                    </span>
                  )}
                </div>

                {/* Headword + Pronunciation + Audio */}
                <div className="flex flex-wrap items-baseline justify-between gap-3 pt-1">
                  <div>
                    <h3 className="text-2xl font-bold text-[#1E1B18] font-serif-archival">
                      {word.localWord}
                    </h3>
                    <span className="text-xs font-mono-archival text-[#B84A27] font-medium">
                      Pronunciation: {word.pronunciation}
                    </span>
                  </div>

                  <AudioPronouncer
                    audioUrl={word.audioUrl}
                    textToSpeak={`${word.localWord}. ${word.exampleSentence}`}
                    label="Pronounce"
                    compact
                  />
                </div>

                {/* Meanings Block */}
                <div className="space-y-2 pt-2 border-t border-[#F3EFE6] text-sm">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5C5449] block">
                      Local Dialect Meaning:
                    </span>
                    <p className="text-[#1E1B18] mt-0.5">{word.meaning}</p>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2C5E4F] block">
                      Standard Language Meaning:
                    </span>
                    <p className="text-[#1E1B18] mt-0.5">
                      {word.standardLanguageMeaning}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#B84A27] block">
                      English Meaning:
                    </span>
                    <p className="text-[#1E1B18] font-medium mt-0.5">
                      {word.englishMeaning}
                    </p>
                  </div>
                </div>

                {/* Example Sentence */}
                <div className="bg-[#FBF9F5] border-l-3 border-[#B84A27] p-3 rounded-r-xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5449] block mb-0.5">
                    Example Sentence in Context:
                  </span>
                  <p className="text-sm italic text-[#1E1B18]">
                    &ldquo;{word.exampleSentence}&rdquo;
                  </p>
                </div>
              </div>

              {/* Footer: Contributor & Approval Badge */}
              <div className="pt-3 border-t border-[#F3EFE6] flex items-center justify-between text-xs text-[#5C5449]">
                <span className="flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#5C5449]" />
                  Contributor:{" "}
                  <strong className="text-[#1E1B18]">
                    {word.contributorName}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1 text-[#1F7A4C] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Public Lexicon
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit New Dialect Word Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-4">
              <div>
                <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                  Contribute a Dialect Word
                </h3>
                <p className="text-xs text-[#5C5449] mt-0.5">
                  Submissions are saved with status = &quot;pending&quot; and reviewed by
                  an administrator before public listing.
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

            <form onSubmit={handleCreateWord} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Local Word *
                  </label>
                  <input
                    type="text"
                    required
                    value={localWord}
                    onChange={(e) => setLocalWord(e.target.value)}
                    placeholder="e.g., वसाण (Vasāṇ)"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Pronunciation (IPA / Phonetic) *
                  </label>
                  <input
                    type="text"
                    value={pronunciation}
                    onChange={(e) => setPronunciation(e.target.value)}
                    placeholder="e.g., /ʋə.sɑːɳ/"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm font-mono-archival"
                  />
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
                    placeholder="e.g., Konkan & Sahyadri"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Dialect Name
                  </label>
                  <input
                    type="text"
                    value={dialectName}
                    onChange={(e) => setDialectName(e.target.value)}
                    placeholder="e.g., Malvani / Konkani"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Local Meaning *
                </label>
                <input
                  type="text"
                  required
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="Explain the meaning in the local context..."
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Standard Language Meaning *
                  </label>
                  <input
                    type="text"
                    required
                    value={standardLanguageMeaning}
                    onChange={(e) => setStandardLanguageMeaning(e.target.value)}
                    placeholder="Marathi / Kannada / Hindi equivalent..."
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    English Meaning *
                  </label>
                  <input
                    type="text"
                    required
                    value={englishMeaning}
                    onChange={(e) => setEnglishMeaning(e.target.value)}
                    placeholder="English definition..."
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Example Sentence *
                </label>
                <textarea
                  rows={2}
                  required
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  placeholder="Provide an authentic sentence using the dialect word..."
                  className="w-full p-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Audio Pronunciation (Optional Upload)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] border border-[#D8CFC0] text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#B84A27]" />
                    <span>
                      {uploadingAudio
                        ? "Uploading..."
                        : "Upload Pronunciation Audio"}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileUpload}
                      className="hidden"
                    />
                  </label>
                  {audioUrl && (
                    <span className="text-xs text-[#1F7A4C] font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Audio attached
                    </span>
                  )}
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
                    <span>Submit for Approval</span>
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
