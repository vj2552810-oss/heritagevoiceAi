"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Trash2,
  BookA,
  Feather,
  Landmark,
  PartyPopper,
  Layers,
  BarChart3,
  X,
  Check,
  KeyRound,
} from "lucide-react";
import type {
  DialectWord,
  FolkStory,
  HeritageEntry,
  User,
} from "@/db/schema";
import { getAuthHeaders } from "@/lib/client-auth";

interface AdminStats {
  totalUsers: number;
  totalContributions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalDialectWords: number;
  totalStories: number;
  totalHeritageLocations: number;
}

interface AdminDashboardViewProps {
  currentUser: Omit<User, "passwordHash"> | null;
  stats: AdminStats;
  allWords: DialectWord[];
  allStories: FolkStory[];
  allHeritage: HeritageEntry[];
  usersList: Omit<User, "passwordHash">[];
  onRefresh: () => void;
  onQuickAdminLogin: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type AdminSubPage =
  | "contributions"
  | "users"
  | "dictionary"
  | "stories"
  | "heritage"
  | "festivals";

export default function AdminDashboardView({
  currentUser,
  stats,
  allWords,
  allStories,
  allHeritage,
  usersList,
  onRefresh,
  onQuickAdminLogin,
  showToast,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<AdminSubPage>("contributions");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  // Edit Modal State
  const [editItem, setEditItem] = useState<{
    entityType: "word" | "story" | "heritage";
    id: number;
    titleOrName: string;
    secondaryField: string;
    region: string;
    categoryOrMeaning: string;
  } | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const handleStatusChange = async (
    entityType: "word" | "story" | "heritage",
    id: number,
    newStatus: "approved" | "rejected"
  ) => {
    if (!isAdmin) {
      showToast(
        "Please click 'Activate Admin Session' above to perform moderation actions.",
        "error"
      );
      return;
    }

    try {
      const res = await fetch("/api/archive", {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType,
          id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Moderation failed");

      showToast(
        `Submission #${id} marked as "${newStatus.toUpperCase()}"!`,
        "success"
      );
      onRefresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update status",
        "error"
      );
    }
  };

  const handleDelete = async (
    entityType: "word" | "story" | "heritage",
    id: number
  ) => {
    if (!isAdmin) {
      showToast(
        "Please click 'Activate Admin Session' above to delete entries.",
        "error"
      );
      return;
    }

    try {
      const res = await fetch(
        `/api/archive?entityType=${entityType}&id=${id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      showToast(`Deleted ${entityType} record #${id}.`, "info");
      onRefresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete item",
        "error"
      );
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    if (!isAdmin) {
      showToast("Admin role required to save edits.", "error");
      return;
    }

    try {
      let updates: Record<string, string> = {};
      if (editItem.entityType === "word") {
        updates = {
          localWord: editItem.titleOrName,
          englishMeaning: editItem.secondaryField,
          meaning: editItem.categoryOrMeaning,
          region: editItem.region,
        };
      } else if (editItem.entityType === "story") {
        updates = {
          title: editItem.titleOrName,
          originalText: editItem.secondaryField,
          category: editItem.categoryOrMeaning,
          region: editItem.region,
        };
      } else {
        updates = {
          name: editItem.titleOrName,
          description: editItem.secondaryField,
          category: editItem.categoryOrMeaning,
          region: editItem.region,
        };
      }

      const res = await fetch("/api/archive", {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType: editItem.entityType,
          id: editItem.id,
          updates,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Edit failed");

      showToast("Archival record updated!", "success");
      setEditItem(null);
      onRefresh();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update item",
        "error"
      );
    }
  };

  const handleToggleUserRole = async (userId: number, currentRole: string) => {
    if (!isAdmin) {
      showToast("Admin authorization required to change user roles.", "error");
      return;
    }
    const targetUser = usersList.find((u) => u.id === userId);
    if (targetUser?.email === "admin@heritagevoice.ai") {
      showToast(
        "Chief Archivist account (admin@heritagevoice.ai) is a protected system administrator.",
        "info"
      );
      return;
    }
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch("/api/archive", {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType: "user",
          id: userId,
          role: nextRole,
        }),
      });
      if (res.ok) {
        showToast(`Updated user #${userId} role to ${nextRole}.`, "success");
        onRefresh();
      }
    } catch {
      showToast("Failed to update user role.", "error");
    }
  };

  // Build unified contributions list for "Manage Contributions"
  const unifiedContributions = [
    ...allWords.map((w) => ({
      entityType: "word" as const,
      id: w.id,
      typeLabel: "Dialect Word",
      title: w.localWord,
      detail: `${w.englishMeaning} (${w.meaning})`,
      category: w.dialectName,
      region: w.region,
      contributor: w.contributorName,
      status: w.status,
      createdAt: w.createdAt,
    })),
    ...allStories.map((s) => ({
      entityType: "story" as const,
      id: s.id,
      typeLabel: s.storyType,
      title: s.title,
      detail: s.originalText,
      category: s.category,
      region: s.region,
      contributor: s.contributorName,
      status: s.status,
      createdAt: s.createdAt,
    })),
    ...allHeritage.map((h) => ({
      entityType: "heritage" as const,
      id: h.id,
      typeLabel:
        h.category === "Festivals" ? "Festival" : `Heritage (${h.category})`,
      title: h.name,
      detail: h.description,
      category: h.category,
      region: h.region,
      contributor: h.contributorName,
      status: h.status,
      createdAt: h.createdAt,
    })),
  ].filter((c) => statusFilter === "all" || c.status === statusFilter);

  const festivalsList = allHeritage.filter((h) => h.category === "Festivals");

  const statusBadge = (st: string) => {
    if (st === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1F7A4C]/15 text-[#1F7A4C] text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approved
        </span>
      );
    }
    if (st === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#B91C1C]/15 text-[#B91C1C] text-xs font-bold">
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C87A19]/20 text-[#9A5B0D] text-xs font-bold">
        <Clock className="w-3.5 h-3.5" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Admin Access Banner */}
      <div className="bg-[#1E1B18] text-white rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B84A27] text-white mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Curator & Governance Control Center
          </span>
          <h2 className="text-2xl md:text-3xl font-bold font-serif-archival">
            Admin Moderation & Archival Analytics Dashboard
          </h2>
          <p className="text-xs text-[#D8CFC0] mt-1">
            Review community submissions (status = &quot;pending&quot;), approve or
            reject entries, edit metadata, and manage users, dialect words,
            stories, heritage sites, and festivals.
          </p>
        </div>

        {!isAdmin ? (
          <button
            type="button"
            onClick={onQuickAdminLogin}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-xs shadow-md transition cursor-pointer shrink-0"
          >
            <KeyRound className="w-4 h-4" />
            Activate Chief Archivist (Admin) Session
          </button>
        ) : (
          <div className="px-4 py-2.5 rounded-xl bg-[#1F7A4C]/25 border border-[#1F7A4C] text-xs font-semibold text-[#A7F3D0] flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            Authenticated as Admin ({currentUser?.name})
          </div>
        )}
      </div>

      {/* 8 Required Admin KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Users",
            val: stats.totalUsers,
            color: "text-[#1E1B18]",
            sub: "Registered archivists",
          },
          {
            label: "Total Contributions",
            val: stats.totalContributions,
            color: "text-[#B84A27]",
            sub: "All submitted records",
          },
          {
            label: "Pending Submissions",
            val: stats.pendingSubmissions,
            color: "text-[#C87A19]",
            sub: "Awaiting moderation",
          },
          {
            label: "Approved Submissions",
            val: stats.approvedSubmissions,
            color: "text-[#1F7A4C]",
            sub: "Live in public archive",
          },
          {
            label: "Rejected Submissions",
            val: stats.rejectedSubmissions,
            color: "text-[#B91C1C]",
            sub: "Filtered by curators",
          },
          {
            label: "Total Dialect Words",
            val: stats.totalDialectWords,
            color: "text-[#2C5E4F]",
            sub: "Approved lexicon entries",
          },
          {
            label: "Total Stories",
            val: stats.totalStories,
            color: "text-[#B84A27]",
            sub: "Oral literature records",
          },
          {
            label: "Total Heritage Locations",
            val: stats.totalHeritageLocations,
            color: "text-[#2C5E4F]",
            sub: "Mapped archive entries",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-white border border-[#E6DFD3] rounded-xl p-4 shadow-2xs"
          >
            <span className="text-xs font-semibold text-[#5C5449] uppercase tracking-wider block">
              {metric.label}
            </span>
            <p
              className={`text-2xl md:text-3xl font-bold font-serif-archival mt-1 ${metric.color}`}
            >
              {metric.val}
            </p>
            <span className="text-[11px] text-[#5C5449]">{metric.sub}</span>
          </div>
        ))}
      </div>

      {/* Visual Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E1B18] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#B84A27]" />
              Archive Composition by Domain
            </h3>
            <span className="text-xs text-[#5C5449]">Live DB Distribution</span>
          </div>
          <div className="space-y-2.5 pt-1">
            {[
              {
                label: "Dialect Dictionary Words",
                count: allWords.length,
                color: "bg-[#B84A27]",
              },
              {
                label: "Folk Stories, Songs & Proverbs",
                count: allStories.length,
                color: "bg-[#2C5E4F]",
              },
              {
                label: "Heritage Archive & Monuments",
                count: allHeritage.length,
                color: "bg-[#1E1B18]",
              },
              {
                label: "Cultural Festivals",
                count: festivalsList.length,
                color: "bg-[#C87A19]",
              },
            ].map((bar) => {
              const pct = Math.min(
                100,
                Math.max(
                  12,
                  Math.round(
                    (bar.count / Math.max(1, stats.totalContributions)) * 100
                  )
                )
              );
              return (
                <div key={bar.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#1E1B18]">
                      {bar.label}
                    </span>
                    <span className="font-mono-archival text-[#5C5449]">
                      {bar.count} records ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F3EFE6] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E1B18] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1F7A4C]" />
              Moderation Pipeline Health
            </h3>
            <span className="text-xs text-[#5C5449]">
              Total: {stats.totalContributions} submissions
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-[#1F7A4C]/10 border border-[#1F7A4C]/30 rounded-xl p-3.5 text-center">
              <span className="text-2xl font-bold text-[#1F7A4C] font-serif-archival">
                {stats.approvedSubmissions}
              </span>
              <span className="block text-xs font-semibold text-[#1E1B18] mt-1">
                Approved
              </span>
            </div>
            <div className="bg-[#C87A19]/15 border border-[#C87A19]/30 rounded-xl p-3.5 text-center">
              <span className="text-2xl font-bold text-[#9A5B0D] font-serif-archival">
                {stats.pendingSubmissions}
              </span>
              <span className="block text-xs font-semibold text-[#1E1B18] mt-1">
                Pending Queue
              </span>
            </div>
            <div className="bg-[#B91C1C]/10 border border-[#B91C1C]/30 rounded-xl p-3.5 text-center">
              <span className="text-2xl font-bold text-[#B91C1C] font-serif-archival">
                {stats.rejectedSubmissions}
              </span>
              <span className="block text-xs font-semibold text-[#1E1B18] mt-1">
                Rejected
              </span>
            </div>
          </div>
          <p className="text-xs text-[#5C5449] pt-1">
            Only submissions with{" "}
            <code className="text-[#1F7A4C] font-bold">
              status = &quot;approved&quot;
            </code>{" "}
            are exposed in the public Dialect Dictionary, Folk Stories, Heritage
            Archive, Map, and AI Search.
          </p>
        </div>
      </div>

      {/* 6 Required Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E6DFD3]">
        {[
          {
            id: "contributions",
            label: `Manage Contributions (${stats.totalContributions})`,
            icon: Layers,
          },
          {
            id: "dictionary",
            label: `Manage Dialect Dictionary (${allWords.length})`,
            icon: BookA,
          },
          {
            id: "stories",
            label: `Manage Stories (${allStories.length})`,
            icon: Feather,
          },
          {
            id: "heritage",
            label: `Manage Heritage (${allHeritage.length})`,
            icon: Landmark,
          },
          {
            id: "festivals",
            label: `Manage Festivals (${festivalsList.length})`,
            icon: PartyPopper,
          },
          {
            id: "users",
            label: `Manage Users (${usersList.length})`,
            icon: Users,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminSubPage)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                active
                  ? "bg-[#1E1B18] text-white"
                  : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#5C5449]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Manage Contributions (Unified Queue) */}
      {activeTab === "contributions" && (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
              All Community Contributions Queue
            </h3>
            <div className="flex items-center gap-1.5">
              {(["all", "pending", "approved", "rejected"] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                      statusFilter === st
                        ? "bg-[#B84A27] text-white"
                        : "bg-[#F3EFE6] text-[#5C5449]"
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6DFD3] text-[#5C5449] uppercase">
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Title / Headword</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Contributor</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">
                    Admin Actions (Approve / Reject / Edit / Delete)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFE6]">
                {unifiedContributions.map((item) => (
                  <tr
                    key={`${item.entityType}-${item.id}`}
                    className="hover:bg-[#FBF9F5]"
                  >
                    <td className="py-3 px-3 font-semibold text-[#2C5E4F]">
                      {item.typeLabel}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#1E1B18] text-sm">
                        {item.title}
                      </p>
                      <p className="text-[#5C5449] line-clamp-1 max-w-md">
                        {item.detail}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-[#5C5449]">{item.region}</td>
                    <td className="py-3 px-3 font-medium text-[#1E1B18]">
                      {item.contributor}
                    </td>
                    <td className="py-3 px-3">{statusBadge(item.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              item.entityType,
                              item.id,
                              "approved"
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-[#1F7A4C] hover:bg-[#166534] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Approve Submission"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              item.entityType,
                              item.id,
                              "rejected"
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-[#C87A19] hover:bg-[#9A5B0D] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Reject Submission"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItem({
                              entityType: item.entityType,
                              id: item.id,
                              titleOrName: item.title,
                              secondaryField: item.detail,
                              region: item.region,
                              categoryOrMeaning: item.category,
                            })
                          }
                          className="p-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18] cursor-pointer"
                          title="Edit Submission"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(item.entityType, item.id)
                          }
                          className="p-1.5 rounded-lg bg-[#B91C1C]/10 hover:bg-[#B91C1C] text-[#B91C1C] hover:text-white cursor-pointer"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Dialect Dictionary */}
      {activeTab === "dictionary" && (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
            Manage Dialect Dictionary Entries
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6DFD3] text-[#5C5449] uppercase">
                  <th className="py-3 px-3">Local Word</th>
                  <th className="py-3 px-3">Pronunciation</th>
                  <th className="py-3 px-3">English & Native Meaning</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFE6]">
                {allWords.map((w) => (
                  <tr key={w.id} className="hover:bg-[#FBF9F5]">
                    <td className="py-3 px-3 font-bold text-sm text-[#1E1B18]">
                      {w.localWord}
                    </td>
                    <td className="py-3 px-3 font-mono-archival text-[#B84A27]">
                      {w.pronunciation}
                    </td>
                    <td className="py-3 px-3 max-w-md">
                      <p className="font-medium text-[#1E1B18]">
                        {w.englishMeaning}
                      </p>
                      <p className="text-[#5C5449]">{w.meaning}</p>
                    </td>
                    <td className="py-3 px-3 text-[#5C5449]">{w.region}</td>
                    <td className="py-3 px-3">{statusBadge(w.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("word", w.id, "approved")
                          }
                          className="px-2.5 py-1 rounded bg-[#1F7A4C] text-white font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("word", w.id, "rejected")
                          }
                          className="px-2.5 py-1 rounded bg-[#C87A19] text-white font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItem({
                              entityType: "word",
                              id: w.id,
                              titleOrName: w.localWord,
                              secondaryField: w.englishMeaning,
                              region: w.region,
                              categoryOrMeaning: w.meaning,
                            })
                          }
                          className="p-1.5 rounded bg-[#F3EFE6] text-[#1E1B18] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("word", w.id)}
                          className="p-1.5 rounded bg-[#B91C1C]/15 text-[#B91C1C] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Manage Stories */}
      {activeTab === "stories" && (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
            Manage Folk Stories, Proverbs, Songs & Oral Histories
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6DFD3] text-[#5C5449] uppercase">
                  <th className="py-3 px-3">Title</th>
                  <th className="py-3 px-3">Type & Category</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Contributor</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFE6]">
                {allStories.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FBF9F5]">
                    <td className="py-3 px-3 max-w-sm">
                      <p className="font-bold text-sm text-[#1E1B18]">
                        {s.title}
                      </p>
                      <p className="text-[#5C5449] line-clamp-1">
                        {s.originalText}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[#B84A27]">
                        {s.storyType}
                      </span>{" "}
                      • {s.category}
                    </td>
                    <td className="py-3 px-3 text-[#5C5449]">{s.region}</td>
                    <td className="py-3 px-3">{s.contributorName}</td>
                    <td className="py-3 px-3">{statusBadge(s.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("story", s.id, "approved")
                          }
                          className="px-2.5 py-1 rounded bg-[#1F7A4C] text-white font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("story", s.id, "rejected")
                          }
                          className="px-2.5 py-1 rounded bg-[#C87A19] text-white font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItem({
                              entityType: "story",
                              id: s.id,
                              titleOrName: s.title,
                              secondaryField: s.originalText,
                              region: s.region,
                              categoryOrMeaning: s.category,
                            })
                          }
                          className="p-1.5 rounded bg-[#F3EFE6] text-[#1E1B18] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("story", s.id)}
                          className="p-1.5 rounded bg-[#B91C1C]/15 text-[#B91C1C] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Manage Heritage */}
      {activeTab === "heritage" && (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
            Manage Heritage Archive Entries (All 11 Categories)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6DFD3] text-[#5C5449] uppercase">
                  <th className="py-3 px-3">Heritage Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Region & Coords</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFE6]">
                {allHeritage.map((h) => (
                  <tr key={h.id} className="hover:bg-[#FBF9F5]">
                    <td className="py-3 px-3 max-w-sm">
                      <p className="font-bold text-sm text-[#1E1B18]">
                        {h.name}
                      </p>
                      <p className="text-[#5C5449] line-clamp-1">
                        {h.description}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#2C5E4F]">
                      {h.category}
                    </td>
                    <td className="py-3 px-3 text-[#5C5449]">
                      {h.region} ({h.latitude.toFixed(2)}°N,{" "}
                      {h.longitude.toFixed(2)}°E)
                    </td>
                    <td className="py-3 px-3">{statusBadge(h.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("heritage", h.id, "approved")
                          }
                          className="px-2.5 py-1 rounded bg-[#1F7A4C] text-white font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("heritage", h.id, "rejected")
                          }
                          className="px-2.5 py-1 rounded bg-[#C87A19] text-white font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItem({
                              entityType: "heritage",
                              id: h.id,
                              titleOrName: h.name,
                              secondaryField: h.description,
                              region: h.region,
                              categoryOrMeaning: h.category,
                            })
                          }
                          className="p-1.5 rounded bg-[#F3EFE6] text-[#1E1B18] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("heritage", h.id)}
                          className="p-1.5 rounded bg-[#B91C1C]/15 text-[#B91C1C] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Manage Festivals */}
      {activeTab === "festivals" && (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
            Manage Regional Festivals & Seasonal Celebrations
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6DFD3] text-[#5C5449] uppercase">
                  <th className="py-3 px-3">Festival Name</th>
                  <th className="py-3 px-3">Description & Customs</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFE6]">
                {festivalsList.map((f) => (
                  <tr key={f.id} className="hover:bg-[#FBF9F5]">
                    <td className="py-3 px-3 font-bold text-sm text-[#1E1B18]">
                      {f.name}
                    </td>
                    <td className="py-3 px-3 max-w-md text-[#5C5449]">
                      {f.description}
                    </td>
                    <td className="py-3 px-3 text-[#1E1B18]">{f.region}</td>
                    <td className="py-3 px-3">{statusBadge(f.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("heritage", f.id, "approved")
                          }
                          className="px-2.5 py-1 rounded bg-[#1F7A4C] text-white font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange("heritage", f.id, "rejected")
                          }
                          className="px-2.5 py-1 rounded bg-[#C87A19] text-white font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItem({
                              entityType: "heritage",
                              id: f.id,
                              titleOrName: f.name,
                              secondaryField: f.description,
                              region: f.region,
                              categoryOrMeaning: "Festivals",
                            })
                          }
                          className="p-1.5 rounded bg-[#F3EFE6] text-[#1E1B18] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete("heritage", f.id)}
                          className="p-1.5 rounded bg-[#B91C1C]/15 text-[#B91C1C] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Manage Users */}
      {activeTab === "users" && (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
            Manage Platform Users & Role Authorizations
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6DFD3] text-[#5C5449] uppercase">
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Region</th>
                  <th className="py-3 px-3">Preferred Language</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-right">Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFE6]">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FBF9F5]">
                    <td className="py-3 px-3 font-bold text-sm text-[#1E1B18]">
                      {u.name}
                    </td>
                    <td className="py-3 px-3 font-mono-archival text-[#5C5449]">
                      {u.email}
                    </td>
                    <td className="py-3 px-3">{u.region}</td>
                    <td className="py-3 px-3">{u.preferredLanguage}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-[#B84A27]/15 text-[#B84A27]"
                            : "bg-[#2C5E4F]/15 text-[#2C5E4F]"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleUserRole(u.id, u.role)}
                        className="px-3 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18] font-semibold cursor-pointer"
                      >
                        Switch to {u.role === "admin" ? "User" : "Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
                Edit Archival Record #{editItem.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="p-1 rounded hover:bg-[#F3EFE6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Title / Word / Name
                </label>
                <input
                  type="text"
                  value={editItem.titleOrName}
                  onChange={(e) =>
                    setEditItem({ ...editItem, titleOrName: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={editItem.region}
                  onChange={(e) =>
                    setEditItem({ ...editItem, region: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Category / Native Meaning
                </label>
                <input
                  type="text"
                  value={editItem.categoryOrMeaning}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      categoryOrMeaning: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Description / Transcript / English Meaning
                </label>
                <textarea
                  rows={3}
                  value={editItem.secondaryField}
                  onChange={(e) =>
                    setEditItem({ ...editItem, secondaryField: e.target.value })
                  }
                  className="w-full p-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#F3EFE6] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#B84A27] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
