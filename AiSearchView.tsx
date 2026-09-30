"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Search,
  ShieldCheck,
  AlertTriangle,
  BookA,
  Feather,
  Landmark,
  Loader2,
  MapPin,
} from "lucide-react";
import type { GroundedSearchResponse } from "@/lib/ai";
import AudioPronouncer from "./AudioPronouncer";

interface AiSearchViewProps {
  initialQuery?: string;
}

const EXAMPLE_QUESTIONS = [
  "Show traditional festivals from this region.",
  "What does this local word mean?",
  "Find folk stories related to farming.",
  "Show historical places near this area.",
];

export default function AiSearchView({ initialQuery = "" }: AiSearchViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<GroundedSearchResponse | null>(null);

  const executeSearch = async (searchText: string) => {
    const clean = searchText.trim();
    if (!clean) return;
    setQuery(clean);
    setSearching(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "semantic-search",
          query: clean,
        }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setResult(data.result);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="space-y-6">
      {/* Search Hero Box */}
      <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-2xl p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B84A27]/15 text-[#B84A27]">
            <Sparkles className="w-3.5 h-3.5" />
            Strictly Grounded Archival Semantic Search
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2C5E4F] bg-[#2C5E4F]/10 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Hallucination Policy Active
          </span>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E1B18] font-serif-archival">
            Ask the Cultural & Dialect Archive
          </h2>
          <p className="text-sm text-[#5C5449] mt-1 max-w-2xl">
            Query verified dialect words, oral histories, festivals, and
            historical monuments in natural language. Our AI answers strictly
            from stored database records and never invents cultural facts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5C5449] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Ask e.g. "Find folk stories related to farming" or "Show traditional festivals from this region"...'
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-white border border-[#D8CFC0] text-sm text-[#1E1B18] focus:outline-none focus:ring-2 focus:ring-[#B84A27]"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="h-12 px-6 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shrink-0"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching Archive...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AI Archive Search</span>
              </>
            )}
          </button>
        </form>

        {/* Starter Question Pills */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#5C5449] uppercase tracking-wider block">
            Example Questions (Click to Run):
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => executeSearch(q)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#1E1B18] hover:text-white border border-[#D8CFC0] text-xs font-medium text-[#1E1B18] transition cursor-pointer"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                executeSearch(
                  "Show ancient Viking shipwrecks in northern Scandinavia."
                )
              }
              className="px-3.5 py-2 rounded-xl bg-[#C87A19]/15 hover:bg-[#C87A19]/25 border border-[#C87A19]/40 text-xs font-semibold text-[#9A5B0D] transition cursor-pointer"
            >
              Test Unrecorded Topic Guard
            </button>
          </div>
        </div>
      </div>

      {/* Results Area */}
      {result && (
        <div className="space-y-6">
          {/* Grounded AI Synthesis Card */}
          <div
            className={`rounded-2xl p-6 border shadow-xs ${
              result.hasMatches
                ? "bg-white border-[#E6DFD3]"
                : "bg-[#C87A19]/10 border-[#C87A19]/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {result.hasMatches ? (
                  <ShieldCheck className="w-5 h-5 text-[#1F7A4C]" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#C87A19]" />
                )}
                <h3 className="text-base font-bold text-[#1E1B18] font-serif-archival">
                  {result.hasMatches
                    ? "Grounded Archival Synthesis"
                    : "Archive Coverage Notice — No Fabricated Data"}
                </h3>
              </div>
              <span className="text-xs font-mono-archival px-2.5 py-1 rounded bg-[#F3EFE6] text-[#5C5449]">
                Engine:{" "}
                {result.mode === "groq-live"
                  ? "Groq LLM (Grounded)"
                  : "Deterministic Archive Index"}
              </span>
            </div>

            <p className="text-sm text-[#1E1B18] whitespace-pre-line leading-relaxed">
              {result.answer}
            </p>
          </div>

          {/* Matched Dialect Words */}
          {result.matchedWords.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-[#1E1B18] font-serif-archival flex items-center gap-2">
                <BookA className="w-5 h-5 text-[#B84A27]" />
                Matched Dialect Dictionary Entries ({result.matchedWords.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.matchedWords.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white border border-[#E6DFD3] rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
                          {w.localWord}
                        </h5>
                        <span className="text-xs font-mono-archival text-[#B84A27]">
                          {w.pronunciation} • {w.region}
                        </span>
                      </div>
                      <AudioPronouncer
                        audioUrl={w.audioUrl}
                        textToSpeak={w.localWord}
                        compact
                      />
                    </div>
                    <p className="text-xs text-[#1E1B18]">
                      <strong>English:</strong> {w.englishMeaning}
                    </p>
                    <p className="text-xs text-[#5C5449]">
                      <strong>Native:</strong> {w.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Folk Stories */}
          {result.matchedStories.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-[#1E1B18] font-serif-archival flex items-center gap-2">
                <Feather className="w-5 h-5 text-[#2C5E4F]" />
                Matched Folk Stories, Songs & Proverbs (
                {result.matchedStories.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.matchedStories.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white border border-[#E6DFD3] rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#B84A27]/15 text-[#B84A27]">
                        {s.storyType} • {s.category}
                      </span>
                      <span className="text-xs text-[#5C5449] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {s.region}
                      </span>
                    </div>
                    <h5 className="text-base font-bold text-[#1E1B18] font-serif-archival">
                      {s.title}
                    </h5>
                    <p className="text-xs italic text-[#1E1B18] bg-[#F3EFE6] p-2.5 rounded-lg">
                      &ldquo;{s.originalText}&rdquo;
                    </p>
                    <p className="text-xs text-[#5C5449]">{s.aiSummary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Heritage Archive Locations */}
          {result.matchedHeritage.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-[#1E1B18] font-serif-archival flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#B84A27]" />
                Matched Heritage Archive Entries ({result.matchedHeritage.length}
                )
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.matchedHeritage.map((h) => (
                  <div
                    key={h.id}
                    className="bg-white border border-[#E6DFD3] rounded-xl overflow-hidden flex flex-col"
                  >
                    <img
                      src={h.imageUrl}
                      alt={h.name}
                      className="h-36 w-full object-cover"
                    />
                    <div className="p-4 space-y-1.5">
                      <span className="text-[11px] font-bold text-[#2C5E4F] uppercase">
                        {h.category} • {h.region}
                      </span>
                      <h5 className="text-sm font-bold text-[#1E1B18] font-serif-archival">
                        {h.name}
                      </h5>
                      <p className="text-xs text-[#5C5449] line-clamp-3">
                        {h.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
