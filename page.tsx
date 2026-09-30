"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Mic,
  BookA,
  Feather,
  Landmark,
  Map as MapIcon,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  LogIn,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  MapPin,
  ArrowRight,
  KeyRound,
  Volume2,
  Loader2,
} from "lucide-react";
import type {
  DialectWord,
  FolkStory,
  HeritageEntry,
  User,
} from "@/db/schema";
import {
  clearClientSession,
  getAuthHeaders,
  loadClientSession,
  saveClientSession,
} from "@/lib/client-auth";
import VoiceStudioView from "@/components/VoiceStudioView";
import DialectDictionaryView from "@/components/DialectDictionaryView";
import FolkStoryView from "@/components/FolkStoryView";
import HeritageArchiveAndMapView, {
  HERITAGE_CATEGORIES,
} from "@/components/HeritageArchiveAndMapView";
import AiSearchView from "@/components/AiSearchView";
import AdminDashboardView from "@/components/AdminDashboardView";
import AudioPronouncer from "@/components/AudioPronouncer";

type NavSection =
  | "dashboard"
  | "voice"
  | "dictionary"
  | "stories"
  | "heritage"
  | "map"
  | "ai-search"
  | "admin";

const VALID_NAV_SECTIONS: NavSection[] = [
  "dashboard",
  "voice",
  "dictionary",
  "stories",
  "heritage",
  "map",
  "ai-search",
  "admin",
];

interface ArchiveStats {
  totalUsers: number;
  totalContributions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalDialectWords: number;
  totalStories: number;
  totalHeritageLocations: number;
}

export default function HeritageVoiceApp() {
  const [activeNav, setActiveNav] = useState<NavSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth & Persistent User State
  const [currentUser, setCurrentUser] = useState<Omit<
    User,
    "passwordHash"
  > | null>(null);
  const [authToken, setAuthToken] = useState<string>("");
  const [aiMode, setAiMode] = useState<"groq-live" | "demo-fallback">(
    "demo-fallback"
  );

  // Strictly separate Login/Register/Forgot modal from User Profile modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">(
    "login"
  );
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Auth Form Inputs
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRegion, setAuthRegion] = useState("Konkan & Sahyadri");
  const [authLanguage, setAuthLanguage] = useState("Marathi");
  const [authBio, setAuthBio] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Archive Data States
  const [loadingData, setLoadingData] = useState(true);
  const [words, setWords] = useState<DialectWord[]>([]);
  const [stories, setStories] = useState<FolkStory[]>([]);
  const [heritage, setHeritage] = useState<HeritageEntry[]>([]);
  const [myWords, setMyWords] = useState<DialectWord[]>([]);
  const [myStories, setMyStories] = useState<FolkStory[]>([]);
  const [myHeritage, setMyHeritage] = useState<HeritageEntry[]>([]);
  const [adminAllWords, setAdminAllWords] = useState<DialectWord[]>([]);
  const [adminAllStories, setAdminAllStories] = useState<FolkStory[]>([]);
  const [adminAllHeritage, setAdminAllHeritage] = useState<HeritageEntry[]>([]);
  const [adminUsers, setAdminUsers] = useState<Omit<User, "passwordHash">[]>(
    []
  );
  const [stats, setStats] = useState<ArchiveStats>({
    totalUsers: 3,
    totalContributions: 30,
    pendingSubmissions: 4,
    approvedSubmissions: 26,
    rejectedSubmissions: 0,
    totalDialectWords: 8,
    totalStories: 6,
    totalHeritageLocations: 11,
  });

  // Quick Header Search
  const [headerSearch, setHeaderSearch] = useState("");

  // Unified Community Contribution Modal
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contribType, setContribType] = useState<
    | "Words"
    | "Stories"
    | "Songs"
    | "Photos"
    | "Heritage places"
    | "Traditions"
    | "Festivals"
  >("Words");
  const [contribTitle, setContribTitle] = useState("");
  const [contribRegion, setContribRegion] = useState("Konkan & Sahyadri");
  const [contribContent, setContribContent] = useState("");
  const [contribTranslation, setContribTranslation] = useState("");
  const [contribSubType, setContribSubType] = useState("Historical Places");
  const [contribSubmitting, setContribSubmitting] = useState(false);

  // Version counter to prevent stale initial requests from overwriting newly authenticated sessions
  const sessionVersionRef = useRef(0);

  // Toast Notification
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 4500);
    },
    []
  );

  // Navigate between sections and keep browser URL synchronized
  const navigateToSection = useCallback((section: NavSection) => {
    setActiveNav(section);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("hv_active_nav", section);
      } catch {
        // Ignore
      }
      try {
        const targetPath = section === "dashboard" ? "/dashboard" : `/${section}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ section }, "", targetPath);
        }
      } catch {
        // Ignore history push error
      }
    }
  }, []);

  // Guarantee Login modal closes whenever user is authenticated
  useEffect(() => {
    if (currentUser && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [currentUser, showAuthModal]);

  // Load persistent session from client storage + verify with /api/auth
  const fetchSessionAndArchive = useCallback(
    async (overrideToken?: string) => {
      const reqVersion = sessionVersionRef.current;
      try {
        const validOverride =
          typeof overrideToken === "string" ? overrideToken : undefined;
        const cachedSession = loadClientSession();
        const storedToken =
          validOverride !== undefined ? validOverride : cachedSession.token;

        if (storedToken) {
          setAuthToken(storedToken);
        }

        const headers = getAuthHeaders({}, storedToken);

        const [authRes, archiveRes] = await Promise.all([
          fetch("/api/auth", {
            credentials: "include",
            headers,
            cache: "no-store",
          }),
          fetch("/api/archive", {
            credentials: "include",
            headers,
            cache: "no-store",
          }),
        ]);

        if (authRes.ok && reqVersion === sessionVersionRef.current) {
          const authData = await authRes.json();
          if (authData.aiMode) setAiMode(authData.aiMode);
          if (authData.user) {
            const activeTok = authData.token || storedToken || "";
            setCurrentUser(authData.user);
            if (activeTok) {
              setAuthToken(activeTok);
              saveClientSession(activeTok, authData.user);
            }
            setAuthName(authData.user.name);
            setAuthRegion(authData.user.region);
            setAuthLanguage(authData.user.preferredLanguage);
            setAuthBio(authData.user.bio || "");
            setShowAuthModal(false);

            // If user was on /login or /register and is now authenticated, move URL to /dashboard
            if (typeof window !== "undefined") {
              const path = window.location.pathname.replace(/^\//, "");
              if (path === "login" || path === "register") {
                try {
                  window.history.replaceState(
                    { section: "dashboard" },
                    "",
                    "/dashboard"
                  );
                } catch {
                  // Ignore
                }
                setActiveNav("dashboard");
              }
            }
          }
        }

        if (archiveRes.ok) {
          const data = await archiveRes.json();
          setWords(data.words || []);
          setStories(data.stories || []);
          setHeritage(data.heritage || []);
          if (data.mySubmissions) {
            setMyWords(data.mySubmissions.words || []);
            setMyStories(data.mySubmissions.stories || []);
            setMyHeritage(data.mySubmissions.heritage || []);
          }
          if (data.adminData) {
            setAdminAllWords(data.adminData.allWords || []);
            setAdminAllStories(data.adminData.allStories || []);
            setAdminAllHeritage(data.adminData.allHeritage || []);
            setAdminUsers(data.adminData.users || []);
          }
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error("Error loading archive:", err);
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  // Initial hydration on mount + popstate listener for browser Back/Forward
  useEffect(() => {
    const cached = loadClientSession();
    if (cached.user) {
      setCurrentUser(cached.user);
      setAuthName(cached.user.name);
      setAuthRegion(cached.user.region);
      setAuthLanguage(cached.user.preferredLanguage);
      setAuthBio(cached.user.bio || "");
    }
    if (cached.token) {
      setAuthToken(cached.token);
    }

    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/^\//, "").toLowerCase();
      if (VALID_NAV_SECTIONS.includes(path as NavSection)) {
        setActiveNav(path as NavSection);
      } else if (path === "login") {
        if (cached.user) {
          setActiveNav("dashboard");
          try {
            window.history.replaceState(
              { section: "dashboard" },
              "",
              "/dashboard"
            );
          } catch {
            // Ignore
          }
        } else {
          setAuthMode("login");
          setShowAuthModal(true);
        }
      } else if (path === "register") {
        if (cached.user) {
          setActiveNav("dashboard");
          try {
            window.history.replaceState(
              { section: "dashboard" },
              "",
              "/dashboard"
            );
          } catch {
            // Ignore
          }
        } else {
          setAuthMode("register");
          setShowAuthModal(true);
        }
      } else if (path === "profile" && cached.user) {
        setShowProfileModal(true);
      } else {
        try {
          const savedNav = window.sessionStorage.getItem(
            "hv_active_nav"
          ) as NavSection | null;
          if (savedNav && VALID_NAV_SECTIONS.includes(savedNav)) {
            setActiveNav(savedNav);
          }
        } catch {
          // Ignore
        }
      }

      const handlePopState = () => {
        const currentPath = window.location.pathname
          .replace(/^\//, "")
          .toLowerCase();
        if (VALID_NAV_SECTIONS.includes(currentPath as NavSection)) {
          setActiveNav(currentPath as NavSection);
        } else if (currentPath === "" || currentPath === "dashboard") {
          setActiveNav("dashboard");
        }
      };

      window.addEventListener("popstate", handlePopState);
      fetchSessionAndArchive(cached.token || undefined);
      return () => window.removeEventListener("popstate", handlePopState);
    }

    fetchSessionAndArchive(cached.token || undefined);
  }, [fetchSessionAndArchive]);

  const completeLoginSuccess = async (
    user: Omit<User, "passwordHash">,
    token: string,
    welcomeMsg: string,
    keepCurrentSection = false
  ) => {
    sessionVersionRef.current += 1;
    saveClientSession(token, user);
    setCurrentUser(user);
    setAuthToken(token);
    setAuthName(user.name);
    setAuthRegion(user.region);
    setAuthLanguage(user.preferredLanguage);
    setAuthBio(user.bio || "");
    setShowAuthModal(false);

    if (!keepCurrentSection) {
      navigateToSection("dashboard");
    }

    showToast(welcomeMsg, "success");
    await fetchSessionAndArchive(token);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const headers = getAuthHeaders(
        { "Content-Type": "application/json" },
        authToken
      );

      if (authMode === "login") {
        const res = await fetch("/api/auth", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            action: "login",
            email: authEmail,
            password: authPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          throw new Error(data.error || "Login failed");
        }

        await completeLoginSuccess(
          data.user,
          data.token,
          `Welcome back, ${data.user.name}!`
        );
      } else if (authMode === "register") {
        const res = await fetch("/api/auth", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            action: "register",
            name: authName,
            email: authEmail,
            password: authPassword,
            region: authRegion,
            preferredLanguage: authLanguage,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.user) {
          throw new Error(data.error || "Registration failed");
        }

        await completeLoginSuccess(
          data.user,
          data.token,
          `Account created for ${data.user.name}! Persistent session active.`
        );
      } else if (authMode === "forgot") {
        const res = await fetch("/api/auth", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            action: "forgot-password",
            email: authEmail,
            newPassword: authPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Reset failed");

        showToast(data.message || "Password updated! Please login.", "success");
        setAuthMode("login");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Authentication error",
        "error"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const headers = getAuthHeaders(
        { "Content-Type": "application/json" },
        authToken
      );
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          action: "update-profile",
          name: authName,
          region: authRegion,
          preferredLanguage: authLanguage,
          bio: authBio,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) throw new Error(data.error || "Update failed");

      setCurrentUser(data.user);
      saveClientSession(authToken, data.user);
      setShowProfileModal(false);
      showToast("Archivist profile updated!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update profile",
        "error"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickDemoLogin = async (
    email: string,
    roleLabel: string,
    keepCurrentSection = false
  ) => {
    setAuthLoading(true);
    setAuthEmail(email);
    setAuthPassword("password123");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email,
          password: "password123",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        throw new Error(data.error || "Demo sign-in failed");
      }

      await completeLoginSuccess(
        data.user,
        data.token,
        `Signed in as ${roleLabel}: ${data.user.name}`,
        keepCurrentSection
      );
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to sign in to demo account.",
        "error"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    sessionVersionRef.current += 1;
    clearClientSession();
    setCurrentUser(null);
    setAuthToken("");
    setShowProfileModal(false);
    setShowAuthModal(false);
    try {
      await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Ignore network error on logout
    }
    showToast("Logged out of session.", "info");
    await fetchSessionAndArchive("");
  };

  // Unified Community Contribution handler (Words, Stories, Songs, Photos, Heritage places, Traditions, Festivals)
  const handleUnifiedContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribTitle.trim() || !contribContent.trim()) {
      showToast("Please provide a title/word and description/text.", "error");
      return;
    }

    setContribSubmitting(true);
    try {
      const headers = getAuthHeaders(
        { "Content-Type": "application/json" },
        authToken
      );

      let payload: Record<string, unknown> = {};

      if (contribType === "Words") {
        payload = {
          entityType: "word",
          localWord: contribTitle,
          pronunciation: `/${contribTitle.trim().toLowerCase()}/`,
          meaning: contribContent,
          standardLanguageMeaning: contribTranslation || contribContent,
          englishMeaning: contribTranslation || contribContent,
          exampleSentence: `${contribTitle} — ${contribContent}`,
          region: contribRegion,
          dialectName: "Regional Community Dialect",
        };
      } else if (contribType === "Stories" || contribType === "Songs") {
        payload = {
          entityType: "story",
          title: contribTitle,
          storyType:
            contribType === "Songs" ? "Traditional Song" : "Folk Story",
          originalText: contribContent,
          standardTranslation: contribTranslation || contribContent,
          englishTranslation: contribTranslation || contribContent,
          aiSummary: `Community-contributed ${contribType.toLowerCase()} from ${contribRegion}.`,
          category:
            contribType === "Songs"
              ? "Folk Music & Ballads"
              : "Ancestral Wisdom",
          region: contribRegion,
          keywords: `${contribType}, ${contribRegion}, Community Archive`,
        };
      } else {
        const mappedCat =
          contribType === "Photos"
            ? "Old Photographs"
            : contribType === "Heritage places"
            ? "Historical Places"
            : contribType === "Traditions"
            ? "Religious/Cultural Traditions"
            : contribType === "Festivals"
            ? "Festivals"
            : contribSubType;

        payload = {
          entityType: "heritage",
          name: contribTitle,
          category: mappedCat,
          description: contribContent,
          historicalInfo: contribTranslation || contribContent,
          region: contribRegion,
          imageUrl:
            contribType === "Photos"
              ? "/images/heritage-old-photo.jpg"
              : contribType === "Festivals"
              ? "/images/heritage-festival.jpg"
              : "/images/heritage-stepwell.jpg",
        };
      }

      const res = await fetch("/api/archive", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      showToast(
        `${contribType} contribution saved with status = "pending"! An admin can now approve it.`,
        "success"
      );
      setContribTitle("");
      setContribContent("");
      setContribTranslation("");
      setShowContributeModal(false);
      await fetchSessionAndArchive(authToken || undefined);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to submit contribution",
        "error"
      );
    } finally {
      setContribSubmitting(false);
    }
  };

  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: "dashboard", label: "Dashboard & Hero", icon: LayoutDashboard },
    { id: "voice", label: "Record Voice Studio", icon: Mic },
    {
      id: "dictionary",
      label: "Dialect Dictionary",
      icon: BookA,
      badge: words.length,
    },
    {
      id: "stories",
      label: "Stories & Translator",
      icon: Feather,
      badge: stories.length,
    },
    {
      id: "heritage",
      label: "Heritage Archive",
      icon: Landmark,
      badge: heritage.length,
    },
    { id: "map", label: "Heritage Map", icon: MapIcon },
    { id: "ai-search", label: "AI Search", icon: Sparkles },
    {
      id: "admin",
      label: "Admin Dashboard",
      icon: ShieldCheck,
      badge: stats.pendingSubmissions,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FBF9F5] text-[#1E1B18]">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-4">
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-lg border text-xs font-semibold ${
              toast.type === "success"
                ? "bg-[#1F7A4C] text-white border-[#166534]"
                : toast.type === "error"
                ? "bg-[#B91C1C] text-white border-[#991B1B]"
                : "bg-[#1E1B18] text-white border-[#5C5449]"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 opacity-80 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Left Persistent Archival Sidebar (Desktop) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-68 lg:fixed lg:inset-y-0 bg-[#F3EFE6] border-r border-[#E6DFD3] z-30 justify-between">
        <div>
          {/* Brand Logo */}
          <div className="p-6 border-b border-[#E6DFD3]">
            <div
              onClick={() => navigateToSection("dashboard")}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#B84A27] text-white flex items-center justify-center shadow-xs font-serif-archival font-bold text-xl">
                H
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#1E1B18] font-serif-archival leading-none">
                  HeritageVoice AI
                </h1>
                <span className="text-[11px] text-[#5C5449] font-medium block mt-1">
                  Local Heritage & Dialect Preserver
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="p-4">
            <button
              type="button"
              onClick={() => setShowContributeModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Contribute to Archive</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToSection(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-[#1E1B18] text-white shadow-2xs"
                      : "text-[#5C5449] hover:bg-[#E6DFD3]/70 hover:text-[#1E1B18]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-[#B84A27]" : "text-[#5C5449]"
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono-archival ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.id === "admin"
                          ? "bg-[#C87A19]/20 text-[#9A5B0D] font-bold"
                          : "bg-[#E6DFD3] text-[#5C5449]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Session Box */}
        <div className="p-4 border-t border-[#E6DFD3] bg-[#FBF9F5]/60 space-y-3">
          {currentUser ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="text-xs font-bold text-[#1E1B18] truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-[#5C5449] truncate">
                    {currentUser.region} • {currentUser.preferredLanguage}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    currentUser.role === "admin"
                      ? "bg-[#B84A27]/15 text-[#B84A27]"
                      : "bg-[#2C5E4F]/15 text-[#2C5E4F]"
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[11px] font-semibold text-[#1E1B18] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <UserIcon className="w-3 h-3" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#B91C1C]/15 text-[11px] font-semibold text-[#B91C1C] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#1E1B18] hover:bg-[#332E2A] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() =>
                    handleQuickDemoLogin("arjun@heritagevoice.ai", "Field User")
                  }
                  className="py-1.5 px-2 rounded-lg bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[10px] font-semibold text-[#1E1B18] cursor-pointer disabled:opacity-60"
                >
                  Demo User
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() =>
                    handleQuickDemoLogin(
                      "admin@heritagevoice.ai",
                      "Chief Archivist Admin"
                    )
                  }
                  className="py-1.5 px-2 rounded-lg bg-[#B84A27]/15 hover:bg-[#B84A27]/25 text-[10px] font-semibold text-[#B84A27] cursor-pointer disabled:opacity-60"
                >
                  Demo Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-68 flex flex-col min-h-screen">
        {/* Sticky Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-[#E6DFD3] px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-[#F3EFE6] text-[#1E1B18]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C5449]">
                Active Module:
              </span>
              <span className="text-sm font-bold text-[#1E1B18] font-serif-archival capitalize">
                {navItems.find((n) => n.id === activeNav)?.label}
              </span>
            </div>
          </div>

          {/* Quick Global Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (headerSearch.trim()) {
                navigateToSection("ai-search");
              }
            }}
            className="flex-1 max-w-md"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5C5449] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onFocus={() => {
                  if (headerSearch.trim()) navigateToSection("ai-search");
                }}
                placeholder="Ask AI or search dialects, stories, festivals..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F3EFE6] border border-[#E6DFD3] text-xs text-[#1E1B18] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B84A27]"
              />
            </div>
          </form>

          {/* Right Status Badges & Quick Account Controls */}
          <div className="flex items-center gap-2.5">
            {/* Persistent AI Status Indicator */}
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono-archival font-semibold border ${
                aiMode === "groq-live"
                  ? "bg-[#1F7A4C]/10 border-[#1F7A4C]/30 text-[#1F7A4C]"
                  : "bg-[#2C5E4F]/10 border-[#2C5E4F]/30 text-[#2C5E4F]"
              }`}
              title="AI Engine Status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  aiMode === "groq-live" ? "bg-[#1F7A4C]" : "bg-[#2C5E4F]"
                }`}
              />
              {aiMode === "groq-live"
                ? "Groq AI: Connected"
                : "AI Mode: Local Demo Fallback"}
            </div>

            {!currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#1E1B18] text-white text-xs font-semibold cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F3EFE6] border border-[#E6DFD3] text-xs font-semibold text-[#1E1B18] cursor-pointer"
                  title="Open Archivist Profile"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#B84A27]" />
                  <span className="max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      currentUser.role === "admin"
                        ? "bg-[#B84A27]/15 text-[#B84A27]"
                        : "bg-[#2C5E4F]/15 text-[#2C5E4F]"
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-xl bg-[#F3EFE6] hover:bg-[#B91C1C]/15 text-[#B91C1C] border border-[#E6DFD3] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#F3EFE6] border-b border-[#E6DFD3] p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigateToSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                      activeNav === item.id
                        ? "bg-[#1E1B18] text-white"
                        : "bg-white text-[#1E1B18]"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#B84A27]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Workspace Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
          {loadingData ? (
            <div className="space-y-4">
              <div className="h-64 rounded-2xl bg-[#F3EFE6] animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="h-28 rounded-xl bg-[#F3EFE6] animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* VIEW 1: LANDING HERO & USER DASHBOARD */}
              {activeNav === "dashboard" && (
                <div className="space-y-8">
                  {/* Authenticated Welcome Strip */}
                  {currentUser && (
                    <div className="bg-[#2C5E4F]/10 border border-[#2C5E4F]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2C5E4F] text-white flex items-center justify-center font-serif-archival font-bold text-base shrink-0">
                          {currentUser.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-[#1E1B18]">
                              Signed in as {currentUser.name}
                            </h2>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#2C5E4F] text-white">
                              {currentUser.role === "admin"
                                ? "Chief Archivist Admin"
                                : "Verified Contributor"}
                            </span>
                          </div>
                          <p className="text-xs text-[#5C5449]">
                            Region: {currentUser.region} • Preferred Language:{" "}
                            {currentUser.preferredLanguage} • Persistent Session
                            Active
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentUser.role === "admin" && (
                          <button
                            type="button"
                            onClick={() => navigateToSection("admin")}
                            className="px-3.5 py-2 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white text-xs font-semibold cursor-pointer"
                          >
                            Open Admin Moderation ({stats.pendingSubmissions}{" "}
                            Pending)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowProfileModal(true)}
                          className="px-3 py-2 rounded-xl bg-white border border-[#D8CFC0] text-xs font-semibold text-[#1E1B18] cursor-pointer"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Required Hero Section */}
                  <section className="relative rounded-3xl overflow-hidden border border-[#E6DFD3] bg-[#F3EFE6] shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
                      <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 space-y-5">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B84A27]/15 text-[#B84A27] text-xs font-bold">
                          <Volume2 className="w-3.5 h-3.5" />
                          Digital Ethnolinguistic & Cultural Heritage Platform
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1E1B18] font-serif-archival leading-tight">
                          Preserve Your Heritage. Preserve Your Voice.
                        </h1>

                        <p className="text-base md:text-lg text-[#5C5449] leading-relaxed max-w-2xl">
                          An AI-powered digital archive for local languages,
                          stories, traditions and cultural heritage.
                        </p>

                        {/* Required Hero CTA Buttons */}
                        <div className="flex flex-wrap items-center gap-3.5 pt-2">
                          <button
                            type="button"
                            onClick={() => navigateToSection("heritage")}
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#1E1B18] hover:bg-[#332E2A] text-white font-semibold text-sm shadow-sm transition cursor-pointer"
                          >
                            <Landmark className="w-4 h-4 text-[#B84A27]" />
                            <span>Explore Heritage</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => navigateToSection("voice")}
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-sm shadow-sm transition cursor-pointer"
                          >
                            <Mic className="w-4 h-4" />
                            <span>Preserve Your Voice</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowContributeModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl bg-white hover:bg-[#E6DFD3] text-[#1E1B18] border border-[#D8CFC0] font-semibold text-xs transition cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4 text-[#2C5E4F]" />
                            <span>Submit Contribution</span>
                          </button>
                        </div>

                        <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-[#5C5449]">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#1F7A4C]" />
                            Speech-to-Text & Dialect Lexicon
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#1F7A4C]" />
                            Marathi, Kannada, Hindi & English
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#1F7A4C]" />
                            Grounded Zero-Hallucination Search
                          </span>
                        </div>
                      </div>

                      {/* Right Featured Archival Showcase Card */}
                      <div className="lg:col-span-5 h-full p-6 bg-[#EFE9DC] border-t lg:border-t-0 lg:border-l border-[#E6DFD3] flex flex-col justify-between space-y-4">
                        <div className="relative h-56 rounded-2xl overflow-hidden border border-[#D8CFC0]">
                          <img
                            src="/images/heritage-folk-music.jpg"
                            alt="Rural Oral Tradition"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                            <span className="text-[10px] font-mono-archival uppercase tracking-wider px-2 py-0.5 rounded bg-[#B84A27] w-fit mb-1">
                              Featured Oral Recording
                            </span>
                            <p className="text-base font-bold font-serif-archival">
                              &ldquo;पाणी जिरंल तं शिवार हिरवं राहील, अन वडिलांची
                              बोली टिकली तं गावची ओळख राहील.&rdquo;
                            </p>
                            <p className="text-xs text-[#E6DFD3] mt-0.5">
                              Ahirani & Sahyadri Proverb — &ldquo;When ancestral
                              dialects endure, the soul of the village
                              survives.&rdquo;
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-[#FBF9F5] border border-[#E6DFD3] rounded-xl p-3">
                          <div>
                            <span className="text-xs font-bold text-[#1E1B18] block">
                              Listen to Native Dialect Cadence
                            </span>
                            <span className="text-[11px] text-[#5C5449]">
                              Preserved Original Voice + AI Phonetics
                            </span>
                          </div>
                          <AudioPronouncer
                            textToSpeak="पाणी जिरंल तं शिवार हिरवं राहील, अन वडिलांची बोली टिकली तं गावची ओळख राहील."
                            label="Play Sample"
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Required User Dashboard 5 KPI Cards */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                        Cultural Preservation Dashboard
                      </h2>
                      <span className="text-xs text-[#5C5449]">
                        Real-time PostgreSQL Archive Metrics
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[
                        {
                          title: "Total Contributions",
                          value: stats.totalContributions,
                          sub: "Community & archival items",
                          accent: "border-l-4 border-l-[#1E1B18]",
                          onClick: () =>
                            navigateToSection(
                              currentUser?.role === "admin"
                                ? "admin"
                                : "dictionary"
                            ),
                        },
                        {
                          title: "Dialect Words Added",
                          value: stats.totalDialectWords,
                          sub: "Verified lexicon headwords",
                          accent: "border-l-4 border-l-[#B84A27]",
                          onClick: () => navigateToSection("dictionary"),
                        },
                        {
                          title: "Stories Preserved",
                          value: stats.totalStories,
                          sub: "Legends, proverbs & songs",
                          accent: "border-l-4 border-l-[#2C5E4F]",
                          onClick: () => navigateToSection("stories"),
                        },
                        {
                          title: "Heritage Places",
                          value: stats.totalHeritageLocations,
                          sub: "Mapped across 11 categories",
                          accent: "border-l-4 border-l-[#1F7A4C]",
                          onClick: () => navigateToSection("map"),
                        },
                        {
                          title: "Pending Contributions",
                          value: stats.pendingSubmissions,
                          sub: "Awaiting curator review",
                          accent: "border-l-4 border-l-[#C87A19]",
                          onClick: () => navigateToSection("admin"),
                        },
                      ].map((card) => (
                        <div
                          key={card.title}
                          onClick={card.onClick}
                          className={`bg-white border border-[#E6DFD3] ${card.accent} rounded-xl p-4 shadow-2xs hover:shadow-md transition cursor-pointer`}
                        >
                          <span className="text-xs font-semibold text-[#5C5449] block">
                            {card.title}
                          </span>
                          <p className="text-3xl font-bold text-[#1E1B18] font-serif-archival mt-1">
                            {card.value}
                          </p>
                          <span className="text-[11px] text-[#5C5449] mt-1 block">
                            {card.sub}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Recent Contributions & Recommended Heritage Content */}
                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Recent Contributions */}
                    <div className="lg:col-span-6 bg-white border border-[#E6DFD3] rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#F3EFE6] pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
                            Recent Community Contributions
                          </h3>
                          <p className="text-xs text-[#5C5449]">
                            Latest dialect words, oral stories, and pending
                            submissions
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowContributeModal(true)}
                          className="text-xs font-semibold text-[#B84A27] hover:underline cursor-pointer"
                        >
                          + Add New
                        </button>
                      </div>

                      <div className="space-y-3">
                        {adminAllWords.slice(0, 3).map((w) => (
                          <div
                            key={`recent-w-${w.id}`}
                            onClick={() => navigateToSection("dictionary")}
                            className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E6DFD3] hover:border-[#B84A27] transition flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#B84A27]">
                                  [Word]
                                </span>
                                <h4 className="text-sm font-bold text-[#1E1B18]">
                                  {w.localWord}
                                </h4>
                                <span className="text-xs font-mono-archival text-[#5C5449]">
                                  {w.pronunciation}
                                </span>
                              </div>
                              <p className="text-xs text-[#5C5449] mt-0.5 line-clamp-1">
                                {w.englishMeaning} • {w.region}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
                                w.status === "approved"
                                  ? "bg-[#1F7A4C]/15 text-[#1F7A4C]"
                                  : "bg-[#C87A19]/20 text-[#9A5B0D]"
                              }`}
                            >
                              {w.status}
                            </span>
                          </div>
                        ))}

                        {adminAllStories.slice(0, 2).map((s) => (
                          <div
                            key={`recent-s-${s.id}`}
                            onClick={() => navigateToSection("stories")}
                            className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E6DFD3] hover:border-[#2C5E4F] transition flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#2C5E4F]">
                                  [{s.storyType}]
                                </span>
                                <h4 className="text-sm font-bold text-[#1E1B18] line-clamp-1">
                                  {s.title}
                                </h4>
                              </div>
                              <p className="text-xs text-[#5C5449] mt-0.5 line-clamp-1">
                                {s.aiSummary}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
                                s.status === "approved"
                                  ? "bg-[#1F7A4C]/15 text-[#1F7A4C]"
                                  : "bg-[#C87A19]/20 text-[#9A5B0D]"
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommended Heritage Content */}
                    <div className="lg:col-span-6 bg-white border border-[#E6DFD3] rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#F3EFE6] pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-[#1E1B18] font-serif-archival">
                            Recommended Heritage Content
                          </h3>
                          <p className="text-xs text-[#5C5449]">
                            Curated historical places, festivals, manuscripts &
                            traditions
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToSection("heritage")}
                          className="text-xs font-semibold text-[#2C5E4F] hover:underline cursor-pointer"
                        >
                          Explore All 11 Categories →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {heritage.slice(0, 4).map((h) => (
                          <div
                            key={`rec-h-${h.id}`}
                            onClick={() => navigateToSection("heritage")}
                            className="group rounded-xl overflow-hidden border border-[#E6DFD3] bg-[#FBF9F5] hover:border-[#B84A27] transition cursor-pointer flex flex-col justify-between"
                          >
                            <div className="relative h-32 w-full overflow-hidden">
                              <img
                                src={h.imageUrl}
                                alt={h.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              />
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold">
                                {h.category}
                              </span>
                            </div>
                            <div className="p-3 space-y-1">
                              <span className="text-[11px] text-[#B84A27] font-semibold flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {h.region}
                              </span>
                              <h4 className="text-xs font-bold text-[#1E1B18] line-clamp-1 font-serif-archival">
                                {h.name}
                              </h4>
                              <p className="text-[11px] text-[#5C5449] line-clamp-2">
                                {h.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* VIEW 2: VOICE PRESERVATION ("Record Voice") */}
              {activeNav === "voice" && (
                <VoiceStudioView
                  userRegion={currentUser?.region}
                  onSavedToArchive={() =>
                    fetchSessionAndArchive(authToken || undefined)
                  }
                  showToast={showToast}
                />
              )}

              {/* VIEW 3: DIALECT DICTIONARY */}
              {activeNav === "dictionary" && (
                <DialectDictionaryView
                  words={words}
                  myWords={myWords}
                  onSubmitted={() =>
                    fetchSessionAndArchive(authToken || undefined)
                  }
                  showToast={showToast}
                />
              )}

              {/* VIEW 4: FOLK STORY PRESERVATION & TRANSLATION */}
              {activeNav === "stories" && (
                <FolkStoryView
                  stories={stories}
                  myStories={myStories}
                  onSubmitted={() =>
                    fetchSessionAndArchive(authToken || undefined)
                  }
                  showToast={showToast}
                />
              )}

              {/* VIEW 5: HERITAGE ARCHIVE (11 CATEGORIES) */}
              {activeNav === "heritage" && (
                <HeritageArchiveAndMapView
                  heritageList={heritage}
                  myHeritage={myHeritage}
                  initialMode="archive"
                  onSubmitted={() =>
                    fetchSessionAndArchive(authToken || undefined)
                  }
                  showToast={showToast}
                />
              )}

              {/* VIEW 6: INTERACTIVE HERITAGE MAP */}
              {activeNav === "map" && (
                <HeritageArchiveAndMapView
                  heritageList={heritage}
                  myHeritage={myHeritage}
                  initialMode="map"
                  onSubmitted={() =>
                    fetchSessionAndArchive(authToken || undefined)
                  }
                  showToast={showToast}
                />
              )}

              {/* VIEW 7: AI SEMANTIC SEARCH */}
              {activeNav === "ai-search" && (
                <AiSearchView initialQuery={headerSearch} />
              )}

              {/* VIEW 8: ADMIN DASHBOARD & MODERATION */}
              {activeNav === "admin" && (
                <AdminDashboardView
                  currentUser={currentUser}
                  stats={stats}
                  allWords={adminAllWords}
                  allStories={adminAllStories}
                  allHeritage={adminAllHeritage}
                  usersList={adminUsers}
                  onRefresh={() =>
                    fetchSessionAndArchive(authToken || undefined)
                  }
                  onQuickAdminLogin={() =>
                    handleQuickDemoLogin(
                      "admin@heritagevoice.ai",
                      "Chief Archivist Admin",
                      true
                    )
                  }
                  showToast={showToast}
                />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E6DFD3] bg-[#F3EFE6] px-6 py-5 text-xs text-[#5C5449]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1E1B18] font-serif-archival">
                HeritageVoice AI — Local Heritage & Dialect Preserver
              </span>
              <span>•</span>
              <span>
                Digital Ethnolinguistic & Cultural Archive Platform
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Sample records are marked with{" "}
                <code className="text-[#1E1B18]">
                  [SAMPLE / DEMO ARCHIVE ENTRY]
                </code>
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Unified Community Contribution Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                  Community Contribution Submission
                </h3>
                <p className="text-xs text-[#5C5449]">
                  Every submission initially receives{" "}
                  <code className="text-[#9A5B0D] font-bold">
                    status = &quot;pending&quot;
                  </code>{" "}
                  until approved by an administrator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContributeModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F3EFE6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUnifiedContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1.5">
                  Select Contribution Type *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      "Words",
                      "Stories",
                      "Songs",
                      "Photos",
                      "Heritage places",
                      "Traditions",
                      "Festivals",
                    ] as const
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContribType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        contribType === t
                          ? "bg-[#B84A27] text-white"
                          : "bg-[#F3EFE6] hover:bg-[#E6DFD3] text-[#1E1B18]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    {contribType === "Words"
                      ? "Local Dialect Word *"
                      : `${contribType} Title / Name *`}
                  </label>
                  <input
                    type="text"
                    required
                    value={contribTitle}
                    onChange={(e) => setContribTitle(e.target.value)}
                    placeholder="Enter name, word, or title..."
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Region *
                  </label>
                  <input
                    type="text"
                    required
                    value={contribRegion}
                    onChange={(e) => setContribRegion(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
              </div>

              {contribType !== "Words" &&
                contribType !== "Stories" &&
                contribType !== "Songs" && (
                  <div>
                    <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                      Heritage Archive Category
                    </label>
                    <select
                      value={contribSubType}
                      onChange={(e) => setContribSubType(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                    >
                      {HERITAGE_CATEGORIES.filter((c) => c !== "All").map(
                        (c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  {contribType === "Words"
                    ? "Native Meaning & Usage *"
                    : "Original Dialect Text / Cultural Description *"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={contribContent}
                  onChange={(e) => setContribContent(e.target.value)}
                  placeholder="Provide the authentic local text, meaning, or cultural details..."
                  className="w-full p-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  English Translation / Historical Notes
                </label>
                <textarea
                  rows={2}
                  value={contribTranslation}
                  onChange={(e) => setContribTranslation(e.target.value)}
                  placeholder="Provide English translation or historical background..."
                  className="w-full p-2.5 rounded-lg bg-white border border-[#D8CFC0] text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContributeModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F3EFE6] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contribSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white text-xs font-semibold cursor-pointer"
                >
                  {contribSubmitting
                    ? "Submitting..."
                    : "Submit (status = 'pending')"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Authentication Modal (ONLY rendered when !currentUser) */}
      {!currentUser && showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                  {authMode === "login" && "Sign In to HeritageVoice AI"}
                  {authMode === "register" && "Create Archivist Account"}
                  {authMode === "forgot" && "Reset Your Password"}
                </h3>
                <p className="text-xs text-[#5C5449]">
                  Persistent session stays active across page navigation and
                  browser refreshes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F3EFE6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#F3EFE6] p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`py-2 rounded-lg cursor-pointer ${
                  authMode === "login"
                    ? "bg-[#1E1B18] text-white"
                    : "text-[#5C5449]"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`py-2 rounded-lg cursor-pointer ${
                  authMode === "register"
                    ? "bg-[#1E1B18] text-white"
                    : "text-[#5C5449]"
                }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("forgot")}
                className={`py-2 rounded-lg cursor-pointer ${
                  authMode === "forgot"
                    ? "bg-[#1E1B18] text-white"
                    : "text-[#5C5449]"
                }`}
              >
                Forgot Password
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g., Soham Deshmukh"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="arjun@heritagevoice.ai or admin@heritagevoice.ai"
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  {authMode === "forgot" ? "New Password *" : "Password *"}
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="password123 (or min 6 chars)"
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              {authMode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                      Region *
                    </label>
                    <input
                      type="text"
                      required
                      value={authRegion}
                      onChange={(e) => setAuthRegion(e.target.value)}
                      placeholder="e.g., Konkan & Sahyadri"
                      className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                      Preferred Language *
                    </label>
                    <select
                      value={authLanguage}
                      onChange={(e) => setAuthLanguage(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                    >
                      <option value="Marathi">Marathi (मराठी)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Konkani / Malvani">
                        Konkani / Malvani
                      </option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : authMode === "login" ? (
                  "Sign In"
                ) : authMode === "register" ? (
                  "Create Account"
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            {/* Quick One-Click Demo Accounts */}
            <div className="pt-3 border-t border-[#E6DFD3] space-y-2">
              <span className="text-[11px] font-semibold text-[#5C5449] uppercase block">
                Instant One-Click Demo Sign-In (Password: password123):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() =>
                    handleQuickDemoLogin(
                      "arjun@heritagevoice.ai",
                      "Field Folklorist"
                    )
                  }
                  className="p-2.5 rounded-xl bg-[#F3EFE6] hover:bg-[#E6DFD3] text-xs font-semibold text-[#1E1B18] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#2C5E4F]" />
                  Field Contributor
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() =>
                    handleQuickDemoLogin(
                      "admin@heritagevoice.ai",
                      "Chief Archivist Admin"
                    )
                  }
                  className="p-2.5 rounded-xl bg-[#B84A27]/15 hover:bg-[#B84A27]/25 text-xs font-semibold text-[#B84A27] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Chief Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated User Profile Modal (ONLY rendered when currentUser is logged in) */}
      {currentUser && showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FBF9F5] border border-[#E6DFD3] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#1E1B18] font-serif-archival">
                  Your Archivist Profile
                </h3>
                <p className="text-xs text-[#5C5449]">
                  {currentUser.email} • Role: {currentUser.role.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F3EFE6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Region *
                </label>
                <input
                  type="text"
                  required
                  value={authRegion}
                  onChange={(e) => setAuthRegion(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Preferred Language *
                </label>
                <select
                  value={authLanguage}
                  onChange={(e) => setAuthLanguage(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D8CFC0] text-sm"
                >
                  <option value="Marathi">Marathi (मराठी)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                  <option value="Konkani / Malvani">Konkani / Malvani</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C5449] uppercase mb-1">
                  Archivist Bio
                </label>
                <textarea
                  rows={2}
                  value={authBio}
                  onChange={(e) => setAuthBio(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-[#D8CFC0] text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-xl bg-[#B91C1C]/10 hover:bg-[#B91C1C]/20 text-[#B91C1C] font-semibold text-xs cursor-pointer"
                >
                  Logout of Session
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#B84A27] hover:bg-[#9E3C1E] text-white font-semibold text-xs transition cursor-pointer"
                >
                  {authLoading ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
