"use client";

import React, { useState } from "react";
import {
  Landmark,
  Map as MapIcon,
  Plus,
  Search,
  MapPin,
  Calendar,
  User as UserIcon,
  Upload,
  X,
  Loader2,
  Compass,
  Clock,
  ScrollText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import type { HeritageEntry } from "@/db/schema";
import { getAuthHeaders } from "@/lib/client-auth";
import AudioPronouncer from "./AudioPronouncer";

export const HERITAGE_CATEGORIES = [
  "All",
  "Historical Places",
  "Festivals",
  "Traditional Food",
  "Clothing",
  "Folk Music",
  "Folk Dance",
  "Traditional Occupations",
  "Customs",
  "Religious/Cultural Traditions",
  "Old Photographs",
  "Historical Documents",
];

interface HeritageArchiveAndMapViewProps {
  heritageList: HeritageEntry[];
  myHeritage: HeritageEntry[];
  initialMode?: "archive" | "map";
  onSubmitted: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function HeritageArchiveAndMapView({
  heritageList,
  myHeritage,
  initialMode = "archive",
  onSubmitted,
  showToast,
}: HeritageArchiveAndMapViewProps) {
  const [viewMode, setViewMode] = useState<"archive" | "map" | "split">(
    initialMode
  );
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<HeritageEntry | null>(
    heritageList[0] || null
  );
  const [mapZoom, setMapZoom] = useState(1);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Submission Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Historical Places");
  const [region, setRegion] = useState("Konkan & Sahyadri");
  const [description, setDescription] = useState("");
  const [historicalInfo, setHistoricalInfo] = useState("");
  const [latitude, setLatitude] = useState("16.6500");
  const [longitude, setLongitude] = useState("74.2500");
  const [imageUrl, setImageUrl] = useState("/images/heritage-stepwell.jpg");
  const [audioUrl, setAudioUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredHeritage = heritageList.filter((item) => {
    const matchesCat =
      selectedCategory === "All" || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.historicalInfo.toLowerCase().includes(q) ||
      item.region.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const myPendingHeritage = myHeritage.filter((h) => h.status === "pending");

  // Convert lat/lng (roughly lat 14.0..20.8, lng 72.6..77.2 in Maharashtra-Goa-Karnataka cultural belt) to SVG map % coordinates
  const latLngToMapPercent = (lat: number, lng: number) => {
    const minLat = 14.2;
    const maxLat = 20.5;
    const minLng = 72.7;
    const maxLng = 77.0;

    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));

    const y = ((maxLat - clampedLat) / (maxLat - minLat)) * 78 + 11;
    const x = ((clampedLng - minLng) / (maxLng - minLng)) * 76 + 12;
    return { x, y };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", "image");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
        showToast("Heritage photograph uploaded!", "success");
      } else {
        showToast(data.error || "Image upload failed", "error");
      }
    } catch {
      showToast("Error uploading image.", "error");
    } finally {
      setUploadingImage(false);
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
        showToast("Heritage audio commentary attached!", "success");
      }
    } catch {
      showToast("Error uploading audio.", "error");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCreateHeritage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !region.trim()) {
      showToast("Name, description, and region are required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType: "heritage",
          name,
          category,
          region,
          description,
          historicalInfo: historicalInfo || description,
          latitude: parseFloat(latitude) || 16.65,
          longitude: parseFloat(longitude) || 74.25,
          imageUrl,
          audioUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit entry");

      showToast(
        "Heritage entry submitted with status = 'pending' for curator verification!",
        "success"
      );
      setName("");
      setDescription("");
      setHistoricalInfo("");
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
      {/* Top Header & View Switcher */}
      <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#2C5E4F]/15 text-[#2C5E4F] mb-2">
            <Landmark className="w-3.5 h-3.5" />
            11-Category Cultural Repository & Spatial Atlas
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E1B18] font-serif-archival">
            {viewMode === "map"
              ? "Interactive Heritage Map"
              : "Cultural Heritage Archive & Map"}
          </h2>
          <p className="text-sm text-[#5C5449] mt-1">
            Explore historical places, festivals, traditional food, clothing,
            folk music & dance, occupations, customs, sacred groves, old
            photographs, and palm-leaf manuscripts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex rounded-xl bg-[#FBF9F5] p-1 border border-[#E6DFD3]">
            <button
              type="button"
              onClick={() => setViewMode("archive")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "archive"
                  ? "bg-[#1E1B18] text-white"
                  : "text-[#5C5449] hover:text-[#1E1B18]"
              }`}
            >
              Archive Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "map"
                  ? "bg-[#B84A27] text-white"
                  : "text-[#5C5449] hover:text-[#1E1B18]"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Interactive Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "split"
                  ? "bg-[#2C5E4F] text-white"
                  : "text-[#5C5449] hover:text-[#1E1B18]"
              }`}
            >
              Split View
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Heritage / Festival
          </button>
        </div>
      </div>

      {/* Pending Heritage Submissions Banner */}
      {myPendingHeritage.length > 0 && (
        <div className="bg-[#C87A19]/10 border border-[#C87A19]/40 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#C87A19] shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-[#1E1B18]">
                Your Pending Heritage Submissions ({myPendingHeritage.length})
              </h4>
              <p className="text-xs text-[#5C5449]">
                {myPendingHeritage.map((h) => h.name).join(" • ")} — Awaiting
                curator approval.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-archival px-2.5 py-1 rounded bg-[#C87A19]/20 text-[#9A5B0D] font-semibold">
            status = &quot;pending&quot;
          </span>
        </div>
      )}

      {/* Search & 11-Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5C5449] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search heritage sites, festivals, cuisine, manuscripts, or regions..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-[#D8CFC0] text-sm text-[#1E1B18] focus:outline-none focus:ring-2 focus:ring-[#B84A27]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
          {HERITAGE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#1E1B18] text-white shadow-xs"
                  : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Heritage Map Section */}
      {(viewMode === "map" || viewMode === "split") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs">
          {/* Interactive Map Canvas */}
          <div className="lg:col-span-7 relative rounded-xl overflow-hidden border border-[#D8CFC0] bg-[#EFE9DC] min-h-[460px] flex flex-col justify-between">
            {/* Map Top Overlay Bar */}
            <div className="relative z-10 p-3.5 flex items-center justify-between bg-gradient-to-b from-[#1E1B18]/70 to-transparent text-white">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#F3EFE6]" />
                <span className="text-xs font-semibold tracking-wide">
                  Sahyadri, Konkan, Deccan & Carnatic Cultural Atlas (
                  {filteredHeritage.length} markers)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.min(1.4, z + 0.15))}
                  title="Zoom In"
                  className="p-1.5 rounded bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.max(0.85, z - 0.15))}
                  title="Zoom Out"
                  className="p-1.5 rounded bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom(1)}
                  title="Reset View"
                  className="p-1.5 rounded bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Cartographic SVG + Interactive Marker Layer */}
            <div
              className="relative flex-1 w-full h-full overflow-hidden transition-transform duration-300"
              style={{ transform: `scale(${mapZoom})` }}
            >
              <svg
                viewBox="0 0 800 520"
                className="w-full h-full object-cover select-none"
              >
                {/* Arabian Sea Coastline on Left */}
                <path
                  d="M 0 0 L 165 0 Q 175 130 155 240 T 190 420 L 210 520 L 0 520 Z"
                  fill="#D4E4E3"
                />
                {/* Coastal Shelf Contour */}
                <path
                  d="M 165 0 Q 175 130 155 240 T 190 420 L 210 520"
                  fill="none"
                  stroke="#95B8B6"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                {/* Western Ghats Escarpment Ridge */}
                <path
                  d="M 245 10 Q 255 150 235 260 T 275 490"
                  fill="none"
                  stroke="#C9BFA9"
                  strokeWidth="18"
                  strokeLinecap="round"
                  opacity="0.55"
                />
                {/* River Topographies (Krishna, Godavari, Kali, Malaprabha) */}
                <path
                  d="M 250 180 Q 420 205 680 245"
                  fill="none"
                  stroke="#A8C5C2"
                  strokeWidth="2.5"
                />
                <path
                  d="M 260 340 Q 430 330 690 365"
                  fill="none"
                  stroke="#A8C5C2"
                  strokeWidth="2.5"
                />

                {/* Graticule Grid Lines */}
                {[100, 200, 300, 400].map((y) => (
                  <line
                    key={`lat-${y}`}
                    x1="0"
                    y1={y}
                    x2="800"
                    y2={y}
                    stroke="#D8CFC0"
                    strokeWidth="0.7"
                    strokeDasharray="4 4"
                  />
                ))}
                {[200, 350, 500, 650].map((x) => (
                  <line
                    key={`lng-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="520"
                    stroke="#D8CFC0"
                    strokeWidth="0.7"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Region Labels */}
                <text
                  x="42"
                  y="280"
                  fill="#2C5E4F"
                  fontSize="13"
                  fontWeight="600"
                  opacity="0.75"
                >
                  ARABIAN SEA
                </text>
                <text
                  x="175"
                  y="220"
                  fill="#5C5449"
                  fontSize="11"
                  fontWeight="700"
                >
                  KONKAN COAST
                </text>
                <text
                  x="275"
                  y="145"
                  fill="#5C5449"
                  fontSize="12"
                  fontWeight="700"
                >
                  SAHYADRI / WESTERN GHATS
                </text>
                <text
                  x="450"
                  y="110"
                  fill="#5C5449"
                  fontSize="12"
                  fontWeight="700"
                >
                  KHANDESH & DECCAN PLATEAU
                </text>
                <text
                  x="390"
                  y="390"
                  fill="#5C5449"
                  fontSize="12"
                  fontWeight="700"
                >
                  DHARWAD & UTTARA KANNADA
                </text>
              </svg>

              {/* Interactive Heritage Markers */}
              {filteredHeritage.map((item) => {
                const pos = latLngToMapPercent(item.latitude, item.longitude);
                const isSelected = selectedEntry?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedEntry(item)}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all ${
                      isSelected ? "z-30 scale-125" : "z-20 hover:scale-110"
                    }`}
                    title={`${item.name} (${item.category})`}
                  >
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-md border text-xs font-bold whitespace-nowrap ${
                        isSelected
                          ? "bg-[#B84A27] text-white border-white ring-4 ring-[#B84A27]/30"
                          : "bg-[#1E1B18] text-white border-[#F3EFE6] hover:bg-[#2C5E4F]"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="max-w-[120px] truncate">
                        {item.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Map Legend Footer */}
            <div className="relative z-10 p-3 bg-[#FBF9F5]/95 border-t border-[#D8CFC0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5449]">
              <span>
                Click any marker pin on the map to inspect heritage photographs,
                region, and historical records.
              </span>
              <span className="font-mono-archival text-[11px]">
                WGS84 Archival Projection
              </span>
            </div>
          </div>

          {/* Selected Marker Detail Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-5">
            {selectedEntry ? (
              <div className="space-y-4">
                <div className="relative h-52 w-full rounded-xl overflow-hidden border border-[#E6DFD3] bg-[#F3EFE6]">
                  <img
                    src={selectedEntry.imageUrl}
                    alt={selectedEntry.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-md bg-[#1E1B18]/85 text-white text-xs font-semibold backdrop-blur-xs">
                      {selectedEntry.category}
                    </span>
                  </div>
                  {selectedEntry.isSample && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-mono-archival px-2 py-0.5 rounded bg-black/75 text-white">
                      [SAMPLE / DEMO ARCHIVE ENTRY]
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#5C5449] mb-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#B84A27]">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedEntry.region}
                    </span>
                    <span className="font-mono-archival text-[11px]">
                      {selectedEntry.latitude.toFixed(4)}° N,{" "}
                      {selectedEntry.longitude.toFixed(4)}° E
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                    {selectedEntry.name}
                  </h3>
                </div>

                <p className="text-sm text-[#1E1B18] leading-relaxed">
                  {selectedEntry.description}
                </p>

                <div className="bg-[#F3EFE6] border border-[#E6DFD3] rounded-xl p-3.5 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2C5E4F] flex items-center gap-1.5">
                    <ScrollText className="w-3.5 h-3.5" />
                    Historical Information
                  </span>
                  <p className="text-xs text-[#5C5449] leading-relaxed">
                    {selectedEntry.historicalInfo}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD3]">
                  <AudioPronouncer
                    audioUrl={selectedEntry.audioUrl}
                    textToSpeak={`${selectedEntry.name}. ${selectedEntry.description}`}
                    label="Listen Audio Guide"
                    compact
                  />
                  <span className="text-xs text-[#5C5449]">
                    By <strong>{selectedEntry.contributorName}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <MapPin className="w-8 h-8 text-[#B84A27] mb-2" />
                <p className="text-sm font-semibold text-[#1E1B18]">
                  Select a marker on the map to inspect its cultural record.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Heritage Archive Cards Grid */}
      {(viewMode === "archive" || viewMode === "split") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHeritage.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="bg-white border border-[#E6DFD3] hover:border-[#B84A27] rounded-2xl overflow-hidden shadow-xs transition flex flex-col justify-between cursor-pointer group"
            >
              <div>
                {/* Image Header */}
                <div className="relative h-48 w-full bg-[#F3EFE6] overflow-hidden">
                  <img
                    src={entry.imageUrl}
                    alt={entry.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-[#1E1B18]/85 text-white text-xs font-semibold backdrop-blur-xs">
                      {entry.category}
                    </span>
                  </div>
                  {entry.isSample && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-mono-archival px-2 py-0.5 rounded bg-black/70 text-white">
                      [SAMPLE / DEMO ARCHIVE ENTRY]
                    </span>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#5C5449]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#B84A27]">
                      <MapPin className="w-3.5 h-3.5" />
                      {entry.region}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival leading-snug">
                    {entry.name}
                  </h3>

                  <p className="text-xs text-[#1E1B18] leading-relaxed line-clamp-3">
                    {entry.description}
                  </p>

                  <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C5E4F] block mb-0.5">
                      Historical Information:
                    </span>
                    <p className="text-xs text-[#5C5449] line-clamp-3">
                      {entry.historicalInfo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3.5 bg-[#FBF9F5] border-t border-[#E6DFD3] flex items-center justify-between">
                <span className="text-xs text-[#5C5449] flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" />
                  <strong className="text-[#1E1B18] truncate max-w-[120px]">
                    {entry.contributorName}
                  </strong>
                </span>

                <AudioPronouncer
                  audioUrl={entry.audioUrl}
                  textToSpeak={`${entry.name}. ${entry.description}`}
                  label="Audio Note"
                  compact
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Heritage Entry Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                  Add Heritage Entry / Photograph / Festival
                </h3>
                <p className="text-xs text-[#5C5449]">
                  Submissions are saved with status = &quot;pending&quot; for curator
                  review.
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

            <form onSubmit={handleCreateHeritage} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Heritage Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ancient Temple Stepwell / Shimga Palkhi Festival"
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Archive Category (All 11 Supported) *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  >
                    {HERITAGE_CATEGORIES.filter((c) => c !== "All").map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                </div>
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the cultural significance, customs, or features..."
                  className="w-full p-2.5 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Historical Information *
                </label>
                <textarea
                  rows={2}
                  required
                  value={historicalInfo}
                  onChange={(e) => setHistoricalInfo(e.target.value)}
                  placeholder="Provide historical background, era, or archival provenance..."
                  className="w-full p-2.5 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Latitude (°N)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm font-mono-archival"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Longitude (°E)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm font-mono-archival"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Upload Photograph / Image
                  </label>
                  <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] border border-[#D8CFC0] text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#B84A27]" />
                    <span>
                      {uploadingImage
                        ? "Uploading image..."
                        : "Upload Photograph"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Upload Audio Commentary (Optional)
                  </label>
                  <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] border border-[#D8CFC0] text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#2C5E4F]" />
                    <span>
                      {uploadingAudio
                        ? "Uploading audio..."
                        : audioUrl
                        ? "Audio Attached ✓"
                        : "Upload Audio"}
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
                    <span>Submit Heritage Entry</span>
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
