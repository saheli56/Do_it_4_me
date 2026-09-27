import { useState, useEffect, useRef } from "preact/hooks";
import type {
  TaskState,
  ServerMessage,
  ExtensionMessage,
  PendingTaskItem,
  TaskPriority,
  TaskCategory,
  ScheduleFrequency,
  PageObservation,
  SecurityChallenge,
  UserProfile,
  CreateUserProfile,
  UpdateUserProfile,
  ProfileIconType,
  ProfileColor,
  AppAccentColor,
  ExecutionStepDetail,
  BillExtractResult,
  BillingCycle
} from "@difm/shared";
import {
  LightningIcon,
  ClockIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  PlayIcon,
  PlusIcon,
  XIcon,
  PencilSimpleIcon,
  BuildingsIcon,
  LinkSimpleIcon,
  InfoIcon,
  ListChecksIcon,
  SparkleIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeSimpleIcon,
  CalendarIcon,
  RepeatIcon,
  TagIcon,
  FlagIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CopyIcon,
  CaretDownIcon,
  CaretUpIcon,
  HouseIcon,
  BriefcaseIcon,
  IdentificationCardIcon,
  StarIcon,
  CheckIcon,
  CreditCardIcon,
  FilmReelIcon,
  CursorClickIcon,
  ArrowCounterClockwiseIcon,
  EyeIcon,
  CodeIcon,
  BrowsersIcon,
  GearIcon,
  PaletteIcon,
  DotsThreeVerticalIcon,
  SlidersIcon,
  UploadSimpleIcon,
  ScanIcon,
  FileArrowUpIcon,
  FloppyDiskIcon,
  FileTextIcon,
  GlobeIcon,
  DeviceMobileIcon,
  ShoppingCartSimpleIcon,
  CurrencyInrIcon
} from "../../src/components/icons";

function getDefaultInitialProfiles(): UserProfile[] {
  let fn = "";
  let ln = "";
  let phone = "";
  let email = "";
  try {
    fn = localStorage.getItem("difm_user_first_name") || "";
    ln = localStorage.getItem("difm_user_last_name") || "";
    if (!fn && !ln) {
      const legacy = localStorage.getItem("difm_user_name") || "";
      const parts = legacy.split(" ");
      fn = parts[0] || "";
      ln = parts.slice(1).join(" ") || "";
    }
    phone = localStorage.getItem("difm_user_phone") || "";
    email = localStorage.getItem("difm_user_email") || "";
  } catch {}

  const now = Date.now();
  return [
    {
      id: "profile-personal",
      label: "Personal",
      isDefault: true,
      icon: "user",
      color: "indigo",
      firstName: fn || "Saheli",
      lastName: ln || "Mukherjee",
      email: email || "saheli56@gmail.com",
      phone: phone || "+91 9876543210",
      address: {
        street: "",
        city: "Kolkata",
        state: "West Bengal",
        postalCode: "700001",
        country: "India"
      },
      business: {},
      customAttributes: {},
      notes: "Primary personal profile for forms, shopping, and bills.",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "profile-work",
      label: "Work & Business",
      isDefault: false,
      icon: "briefcase",
      color: "blue",
      firstName: fn || "",
      lastName: ln || "",
      email: email ? email.replace("@gmail.com", "@company.com") : "",
      phone: phone || "",
      address: {
        city: "Bangalore",
        state: "Karnataka",
        country: "India"
      },
      business: {
        companyName: "Acme Technologies LLC",
        department: "Engineering",
        designation: "Software Engineer",
        taxIdOrGst: "19ABCDE1234F1Z5"
      },
      customAttributes: {},
      notes: "Corporate business profile for invoices, vendor portals, and tax filings.",
      createdAt: now + 1,
      updatedAt: now + 1
    },
    {
      id: "profile-family",
      label: "Family & Household",
      isDefault: false,
      icon: "house",
      color: "emerald",
      firstName: fn || "Family",
      lastName: ln || "Home",
      email: email || "",
      phone: phone || "",
      address: {
        city: "Kolkata",
        country: "India"
      },
      business: {},
      customAttributes: {},
      notes: "Household utilities, electricity, broadband, and family services.",
      createdAt: now + 2,
      updatedAt: now + 2
    }
  ];
}

function renderProfileIcon(iconName?: ProfileIconType, size = 13, className = "") {
  switch (iconName) {
    case "briefcase":
      return <BriefcaseIcon size={size} class={className} />;
    case "house":
      return <HouseIcon size={size} class={className} />;
    case "sparkle":
      return <SparkleIcon size={size} class={className} />;
    case "buildings":
      return <BuildingsIcon size={size} class={className} />;
    case "credit-card":
      return <CreditCardIcon size={size} class={className} />;
    case "tag":
      return <TagIcon size={size} class={className} />;
    case "user":
    default:
      return <UserIcon size={size} class={className} />;
  }
}

function getProfileColorStyles(color?: ProfileColor) {
  switch (color) {
    case "emerald":
      return {
        badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
        border: "border-emerald-500/40",
        bgLight: "bg-emerald-950/30",
        accentText: "text-emerald-300"
      };
    case "amber":
      return {
        badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
        border: "border-amber-500/40",
        bgLight: "bg-amber-950/30",
        accentText: "text-amber-300"
      };
    case "violet":
      return {
        badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
        dot: "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.6)]",
        border: "border-violet-500/40",
        bgLight: "bg-violet-950/30",
        accentText: "text-violet-300"
      };
    case "rose":
      return {
        badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        dot: "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]",
        border: "border-rose-500/40",
        bgLight: "bg-rose-950/30",
        accentText: "text-rose-300"
      };
    case "blue":
      return {
        badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        dot: "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]",
        border: "border-blue-500/40",
        bgLight: "bg-blue-950/30",
        accentText: "text-blue-300"
      };
    case "cyan":
      return {
        badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        dot: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]",
        border: "border-cyan-500/40",
        bgLight: "bg-cyan-950/30",
        accentText: "text-cyan-300"
      };
    case "indigo":
    default:
      return {
        badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        dot: "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]",
        border: "border-indigo-500/40",
        bgLight: "bg-indigo-950/30",
        accentText: "text-indigo-300"
      };
  }
}

export interface AccentThemeOption {
  id: AppAccentColor;
  label: string;
  previewColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export const ACCENT_THEME_OPTIONS: AccentThemeOption[] = [
  {
    id: "indigo",
    label: "Indigo",
    previewColor: "#6366F1",
    gradientFrom: "#4f46e5",
    gradientTo: "#818cf8"
  },
  {
    id: "mint",
    label: "Mint",
    previewColor: "#10B981",
    gradientFrom: "#059669",
    gradientTo: "#34d399"
  },
  {
    id: "cherry",
    label: "Cherry",
    previewColor: "#F43F5E",
    gradientFrom: "#e11d48",
    gradientTo: "#fb7185"
  },
  {
    id: "amber",
    label: "Amber",
    previewColor: "#F59E0B",
    gradientFrom: "#d97706",
    gradientTo: "#fbbf24"
  },
  {
    id: "cyan",
    label: "Cyan",
    previewColor: "#06B6D4",
    gradientFrom: "#0891b2",
    gradientTo: "#22d3ee"
  },
  {
    id: "violet",
    label: "Violet",
    previewColor: "#8B5CF6",
    gradientFrom: "#7c3aed",
    gradientTo: "#a78bfa"
  },
  {
    id: "sapphire",
    label: "Sapphire",
    previewColor: "#2563EB",
    gradientFrom: "#1d4ed8",
    gradientTo: "#60a5fa"
  },
  {
    id: "magenta",
    label: "Magenta",
    previewColor: "#BE123C",
    gradientFrom: "#9f1239",
    gradientTo: "#f43f5e"
  },
  {
    id: "emerald",
    label: "Emerald",
    previewColor: "#059669",
    gradientFrom: "#047857",
    gradientTo: "#10b981"
  },
  {
    id: "coral",
    label: "Coral",
    previewColor: "#FF6B6B",
    gradientFrom: "#ee5253",
    gradientTo: "#ff8787"
  },
  {
    id: "lavender",
    label: "Lavender",
    previewColor: "#A855F7",
    gradientFrom: "#9333ea",
    gradientTo: "#c084fc"
  },
  {
    id: "teal",
    label: "Teal",
    previewColor: "#0D9488",
    gradientFrom: "#0f766e",
    gradientTo: "#2dd4bf"
  },
  {
    id: "peach_fuzz",
    label: "Peach Fuzz",
    previewColor: "#FF7A59",
    gradientFrom: "#f06a4b",
    gradientTo: "#ff9b82"
  },
  {
    id: "lime",
    label: "Lime",
    previewColor: "#84CC16",
    gradientFrom: "#65a30d",
    gradientTo: "#a3e635"
  },
  {
    id: "ocean",
    label: "Ocean",
    previewColor: "#0EA5E9",
    gradientFrom: "#0284c7",
    gradientTo: "#38bdf8"
  },
  {
    id: "flame",
    label: "Flame",
    previewColor: "#FF5722",
    gradientFrom: "#e64a19",
    gradientTo: "#ff7043"
  },
  {
    id: "aurora",
    label: "Aurora",
    previewColor: "#00B4D8",
    gradientFrom: "#0096c7",
    gradientTo: "#48cae4"
  },
  {
    id: "gold",
    label: "Gold",
    previewColor: "#EAB308",
    gradientFrom: "#ca8a04",
    gradientTo: "#facc15"
  }
];

function getAccentThemeStyles(accent: AppAccentColor) {
  switch (accent) {
    case "violet":
      return {
        badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
        tabActive: "bg-gradient-to-r from-violet-500/25 via-violet-600/25 to-purple-500/25 border-violet-500/50 text-violet-200 shadow-glow-sm",
        iconText: "text-violet-400",
        pillBg: "bg-violet-600/30 border-violet-500 text-violet-200",
        btnPrimary: "bg-violet-600 hover:bg-violet-500 text-white shadow-glow-sm",
        borderHighlight: "border-violet-500/40",
        textHighlight: "text-violet-300"
      };
    case "mint":
    case "emerald":
      return {
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        tabActive: "bg-gradient-to-r from-emerald-500/25 via-emerald-600/25 to-teal-500/25 border-emerald-500/50 text-emerald-200 shadow-glow-sm",
        iconText: "text-emerald-400",
        pillBg: "bg-emerald-600/30 border-emerald-500 text-emerald-200",
        btnPrimary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-sm",
        borderHighlight: "border-emerald-500/40",
        textHighlight: "text-emerald-300"
      };
    case "cyan":
    case "aurora":
      return {
        badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        tabActive: "bg-gradient-to-r from-cyan-500/25 via-cyan-600/25 to-blue-500/25 border-cyan-500/50 text-cyan-200 shadow-glow-sm",
        iconText: "text-cyan-400",
        pillBg: "bg-cyan-600/30 border-cyan-500 text-cyan-200",
        btnPrimary: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-glow-sm",
        borderHighlight: "border-cyan-500/40",
        textHighlight: "text-cyan-300"
      };
    case "cherry":
    case "magenta":
      return {
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        tabActive: "bg-gradient-to-r from-rose-500/25 via-rose-600/25 to-pink-500/25 border-rose-500/50 text-rose-200 shadow-glow-sm",
        iconText: "text-rose-400",
        pillBg: "bg-rose-600/30 border-rose-500 text-rose-200",
        btnPrimary: "bg-rose-600 hover:bg-rose-500 text-white shadow-glow-sm",
        borderHighlight: "border-rose-500/40",
        textHighlight: "text-rose-300"
      };
    case "amber":
    case "gold":
      return {
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        tabActive: "bg-gradient-to-r from-amber-500/25 via-amber-600/25 to-yellow-500/25 border-amber-500/50 text-amber-200 shadow-glow-sm",
        iconText: "text-amber-400",
        pillBg: "bg-amber-600/30 border-amber-500 text-amber-200",
        btnPrimary: "bg-amber-600 hover:bg-amber-500 text-white shadow-glow-sm",
        borderHighlight: "border-amber-500/40",
        textHighlight: "text-amber-300"
      };
    case "lavender":
      return {
        badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        tabActive: "bg-gradient-to-r from-purple-500/25 via-purple-600/25 to-fuchsia-500/25 border-purple-500/50 text-purple-200 shadow-glow-sm",
        iconText: "text-purple-400",
        pillBg: "bg-purple-600/30 border-purple-500 text-purple-200",
        btnPrimary: "bg-purple-600 hover:bg-purple-500 text-white shadow-glow-sm",
        borderHighlight: "border-purple-500/40",
        textHighlight: "text-purple-300"
      };
    case "teal":
      return {
        badge: "bg-teal-500/15 text-teal-300 border-teal-500/30",
        tabActive: "bg-gradient-to-r from-teal-500/25 via-teal-600/25 to-emerald-500/25 border-teal-500/50 text-teal-200 shadow-glow-sm",
        iconText: "text-teal-400",
        pillBg: "bg-teal-600/30 border-teal-500 text-teal-200",
        btnPrimary: "bg-teal-600 hover:bg-teal-500 text-white shadow-glow-sm",
        borderHighlight: "border-teal-500/40",
        textHighlight: "text-teal-300"
      };
    case "sapphire":
    case "ocean":
      return {
        badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        tabActive: "bg-gradient-to-r from-blue-500/25 via-blue-600/25 to-sky-500/25 border-blue-500/50 text-blue-200 shadow-glow-sm",
        iconText: "text-blue-400",
        pillBg: "bg-blue-600/30 border-blue-500 text-blue-200",
        btnPrimary: "bg-blue-600 hover:bg-blue-500 text-white shadow-glow-sm",
        borderHighlight: "border-blue-500/40",
        textHighlight: "text-blue-300"
      };
    case "coral":
    case "peach_fuzz":
    case "flame":
      return {
        badge: "bg-orange-500/15 text-orange-300 border-orange-500/30",
        tabActive: "bg-gradient-to-r from-orange-500/25 via-orange-600/25 to-rose-500/25 border-orange-500/50 text-orange-200 shadow-glow-sm",
        iconText: "text-orange-400",
        pillBg: "bg-orange-600/30 border-orange-500 text-orange-200",
        btnPrimary: "bg-orange-600 hover:bg-orange-500 text-white shadow-glow-sm",
        borderHighlight: "border-orange-500/40",
        textHighlight: "text-orange-300"
      };
    case "lime":
      return {
        badge: "bg-lime-500/15 text-lime-300 border-lime-500/30",
        tabActive: "bg-gradient-to-r from-lime-500/25 via-lime-600/25 to-emerald-500/25 border-lime-500/50 text-lime-200 shadow-glow-sm",
        iconText: "text-lime-400",
        pillBg: "bg-lime-600/30 border-lime-500 text-lime-200",
        btnPrimary: "bg-lime-600 hover:bg-lime-500 text-white shadow-glow-sm",
        borderHighlight: "border-lime-500/40",
        textHighlight: "text-lime-300"
      };
    case "indigo":
    default:
      return {
        badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        tabActive: "bg-gradient-to-r from-indigo-500/25 via-indigo-600/25 to-violet-500/25 border-indigo-500/50 text-indigo-200 shadow-glow-sm",
        iconText: "text-indigo-400",
        pillBg: "bg-indigo-600/30 border-indigo-500 text-indigo-200",
        btnPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow-sm",
        borderHighlight: "border-indigo-500/40",
        textHighlight: "text-indigo-300"
      };
  }
}

export interface RawNoteItem {
  id: string;
  rawText: string;
  createdAt: number;
  status: "DRAFT" | "NEEDS_CLARIFICATION" | "SCHEDULED";
  linkedTaskId?: string;
  parsedDraft?: {
    formattedGoal: string;
    title: string;
    category: TaskCategory;
    billingCycle: BillingCycle;
    dueDate?: string;
    dueAmount?: string;
    consumerNumber?: string;
    providerName?: string;
    targetUrl?: string;
    schedule?: {
      enabled: boolean;
      frequency: ScheduleFrequency;
      time: string;
      dayOfMonth?: number;
      dayOfWeek?: number;
      intervalDays?: number;
      autoExecute: boolean;
    };
    missingFields: Array<"consumerNumber" | "providerName" | "dueAmount" | "targetUrl" | "dueDate">;
    clarificationPrompt?: string;
    requiresHumanApproval: boolean;
    safetySummary: string;
    priceCondition?: import("@difm/shared").PriceCondition;
  };
}

export function App() {
  const [activeTab, setActiveTab] = useState<"EXECUTE" | "NOTES" | "PENDING">("EXECUTE");
  const [goal, setGoal] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [securityChallenge, setSecurityChallenge] = useState<SecurityChallenge | null>(null);
  const [approvalPrompt, setApprovalPrompt] = useState<{
    summary: string;
    consequences: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    summary: string;
  } | null>(null);

  // App Theme & Accent Color State
  const [accentColor, setAccentColor] = useState<AppAccentColor>(() => {
    try {
      return (localStorage.getItem("difm_theme_accent") as AppAccentColor) || "violet";
    } catch {
      return "violet";
    }
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Identity Profile Vault State
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem("difm_saved_user_profiles");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return getDefaultInitialProfiles();
    } catch {
      return getDefaultInitialProfiles();
    }
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      return localStorage.getItem("difm_active_profile_id") || "profile-personal";
    } catch {
      return "profile-personal";
    }
  });
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileVaultModalOpen, setIsProfileVaultModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [isCreatingNewProfile, setIsCreatingNewProfile] = useState(false);

  // Smart Notes & Raw Reminders State
  const [savedNotes, setSavedNotes] = useState<RawNoteItem[]>(() => {
    try {
      const cached = localStorage.getItem("difm_saved_rough_notes");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: "note-sample-1",
        rawText: "CESC electric bill around 1450 due before oct 15, pay on 5th every month",
        createdAt: Date.now() - 3600000,
        status: "NEEDS_CLARIFICATION",
        parsedDraft: {
          formattedGoal:
            "Autonomously navigate to CESC electricity portal, locate consumer billing account, verify amount ₹1,450, and pause for human confirmation before payment.",
          title: "Pay CESC Electricity Bill",
          category: "ELECTRICITY",
          billingCycle: "MONTHLY",
          dueAmount: "₹1,450",
          dueDate: "2026-10-15",
          providerName: "CESC Electricity",
          targetUrl: "https://www.cesc.co.in",
          schedule: {
            enabled: true,
            frequency: "MONTHLY",
            time: "09:30",
            dayOfMonth: 5,
            autoExecute: false
          },
          missingFields: ["consumerNumber"],
          clarificationPrompt:
            "What is your CESC Consumer ID or Account Number to complete this scheduled task?",
          requiresHumanApproval: true,
          safetySummary:
            "Safety Guard: The agent will navigate and prepare payment, reminding you for final approval before any charge."
        }
      }
    ];
  });
  const [noteInput, setNoteInput] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("difm_saved_rough_notes");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed[0]?.rawText) return parsed[0].rawText;
      }
    } catch {}
    return "CESC electric bill around 1450 due before oct 15, pay on 5th every month";
  });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    try {
      const cached = localStorage.getItem("difm_saved_rough_notes");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed[0]?.id) return parsed[0].id;
      }
    } catch {}
    return "note-sample-1";
  });
  const [isNoteAnalyzing, setIsNoteAnalyzing] = useState(false);
  const [activeNoteDraft, setActiveNoteDraft] = useState<RawNoteItem["parsedDraft"] | null>(() => {
    try {
      const cached = localStorage.getItem("difm_saved_rough_notes");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed[0]?.parsedDraft) return parsed[0].parsedDraft;
      }
    } catch {}
    return {
      formattedGoal:
        "Autonomously navigate to CESC electricity portal, locate consumer billing account, verify amount ₹1,450, and pause for human confirmation before payment.",
      title: "Pay CESC Electricity Bill",
      category: "ELECTRICITY",
      billingCycle: "MONTHLY",
      dueAmount: "₹1,450",
      dueDate: "2026-10-15",
      providerName: "CESC Electricity",
      targetUrl: "https://www.cesc.co.in",
      schedule: {
        enabled: true,
        frequency: "MONTHLY",
        time: "09:30",
        dayOfMonth: 5,
        autoExecute: false
      },
      missingFields: ["consumerNumber"],
      clarificationPrompt:
        "What is your CESC Consumer ID or Account Number to complete this scheduled task?",
      requiresHumanApproval: true,
      safetySummary:
        "Safety Guard: The agent will navigate and prepare payment, reminding you for final approval before any charge."
    };
  });
  const [attachedTabNotice, setAttachedTabNotice] = useState<string | null>(null);
  const [isUrlAttachOpen, setIsUrlAttachOpen] = useState(false);
  const [customPortalUrl, setCustomPortalUrl] = useState("");

  // AI Smart Task Architect & Auto-Scheduler State
  const [isSmartSchedulerOpen, setIsSmartSchedulerOpen] = useState(false);
  const [isFormattingTask, setIsFormattingTask] = useState(false);
  const [parsedTaskDraft, setParsedTaskDraft] = useState<{
    formattedGoal: string;
    title: string;
    category: TaskCategory;
    billingCycle: BillingCycle;
    dueDate?: string;
    dueAmount?: string;
    consumerNumber?: string;
    providerName?: string;
    targetUrl?: string;
    schedule?: {
      enabled: boolean;
      frequency: ScheduleFrequency;
      time: string;
      dayOfMonth?: number;
      dayOfWeek?: number;
      intervalDays?: number;
      autoExecute: boolean;
    };
    missingFields: Array<"consumerNumber" | "providerName" | "dueAmount" | "targetUrl" | "dueDate">;
    clarificationPrompt?: string;
    requiresHumanApproval: boolean;
    safetySummary: string;
    priceCondition?: import("@difm/shared").PriceCondition;
  } | null>(null);

  // Profile Editor Form State
  const [profLabel, setProfLabel] = useState("");
  const [profIcon, setProfIcon] = useState<ProfileIconType>("user");
  const [profColor, setProfColor] = useState<ProfileColor>("indigo");
  const [profFirstName, setProfFirstName] = useState("");
  const [profLastName, setProfLastName] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profStreet, setProfStreet] = useState("");
  const [profCity, setProfCity] = useState("");
  const [profState, setProfState] = useState("");
  const [profPostalCode, setProfPostalCode] = useState("");
  const [profCountry, setProfCountry] = useState("");
  const [profCompanyName, setProfCompanyName] = useState("");
  const [profTaxId, setProfTaxId] = useState("");
  const [profDepartment, setProfDepartment] = useState("");
  const [profDesignation, setProfDesignation] = useState("");
  const [profNotes, setProfNotes] = useState("");
  const [profCustomAttrs, setProfCustomAttrs] = useState<Array<{ key: string; value: string }>>([]);

  // Pending Tasks & Scheduling State
  const [pendingTasks, setPendingTasks] = useState<PendingTaskItem[]>(() => {
    try {
      const cached = localStorage.getItem("difm_saved_pending_tasks");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [remindersDue, setRemindersDue] = useState<PendingTaskItem[]>([]);
  const [scheduledReady, setScheduledReady] = useState<PendingTaskItem[]>([]);

  // Task Creation Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [newTaskProfileId, setNewTaskProfileId] = useState<string>("");
  const [showBillerDetails, setShowBillerDetails] = useState(false);
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);

  // Schedule Configuration State
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState<ScheduleFrequency>("MONTHLY");
  const [scheduleTime, setScheduleTime] = useState("09:30");
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState<number>(5);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<number>(1);
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState<number>(3);
  const [scheduleAutoExecute, setScheduleAutoExecute] = useState(true);

  // Biller & Profile Details
  const [billerProvider, setBillerProvider] = useState("");
  const [billerType, setBillerType] = useState<TaskCategory>("GENERAL");
  const [billerBillingCycle, setBillerBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [billerConsumerNo, setBillerConsumerNo] = useState("");
  const [billerAmount, setBillerAmount] = useState("");
  const [billerSubdivision, setBillerSubdivision] = useState("");
  const [billerPortalUrl, setBillerPortalUrl] = useState("");
  const [billerFirstName, setBillerFirstName] = useState(() => {
    try {
      const fn = localStorage.getItem("difm_user_first_name");
      if (fn) return fn;
      const legacy = localStorage.getItem("difm_user_name") || "";
      return legacy.split(" ")[0] || "Saheli";
    } catch {
      return "Saheli";
    }
  });
  const [billerLastName, setBillerLastName] = useState(() => {
    try {
      const ln = localStorage.getItem("difm_user_last_name");
      if (ln) return ln;
      const legacy = localStorage.getItem("difm_user_name") || "";
      const parts = legacy.split(" ");
      return parts.length > 1 ? parts.slice(1).join(" ") : "Mukherjee";
    } catch {
      return "Mukherjee";
    }
  });
  const [billerPhone, setBillerPhone] = useState(() => {
    try {
      return localStorage.getItem("difm_user_phone") || "+91 9876543210";
    } catch {
      return "+91 9876543210";
    }
  });
  const [billerEmail, setBillerEmail] = useState(() => {
    try {
      return localStorage.getItem("difm_user_email") || "saheli56@gmail.com";
    } catch {
      return "saheli56@gmail.com";
    }
  });
  const [billerInstructions, setBillerInstructions] = useState("");

  // Bill Document Drag & Drop / Paste Extraction State
  const [isExtractingBill, setIsExtractingBill] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const [isDraggingBill, setIsDraggingBill] = useState(false);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"created" | "dueDate" | "nextRun" | "priority">("created");

  // Editing Task Modal State
  const [editingTask, setEditingTask] = useState<PendingTaskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editCategory, setEditCategory] = useState<TaskCategory>("GENERAL");
  const [editBillingCycle, setEditBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editProfileId, setEditProfileId] = useState<string>("");
  const [editProvider, setEditProvider] = useState("");
  const [editConsumerNo, setEditConsumerNo] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editSubdivision, setEditSubdivision] = useState("");
  const [editPortalUrl, setEditPortalUrl] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editScheduleEnabled, setEditScheduleEnabled] = useState(false);
  const [editScheduleFreq, setEditScheduleFreq] = useState<ScheduleFrequency>("MONTHLY");
  const [editScheduleTime, setEditScheduleTime] = useState("09:30");
  const [editScheduleDayOfMonth, setEditScheduleDayOfMonth] = useState<number>(5);
  const [editScheduleDayOfWeek, setEditScheduleDayOfWeek] = useState<number>(1);
  const [editScheduleIntervalDays, setEditScheduleIntervalDays] = useState<number>(3);
  const [editScheduleAutoExecute, setEditScheduleAutoExecute] = useState(true);

  // History & Inline Notes
  const [expandedHistoryTaskId, setExpandedHistoryTaskId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState("");

  // Visual Execution Replay & Step Inspector State
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [replayTitle, setReplayTitle] = useState("");
  const [replayStatus, setReplayStatus] = useState<"SUCCESS" | "FAILED" | "IN_PROGRESS" | "CANCELLED">("IN_PROGRESS");
  const [replayDurationMs, setReplayDurationMs] = useState(0);
  const [replaySteps, setReplaySteps] = useState<ExecutionStepDetail[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replayPlaybackSpeed, setReplayPlaybackSpeed] = useState<number>(1);
  const [stepFilterType, setStepFilterType] = useState<string>("ALL");
  const [stepSearchQuery, setStepSearchQuery] = useState<string>("");

  const socketRef = useRef<WebSocket | null>(null);
  const executionTabIdRef = useRef<number | null>(null);
  const currentGoalRef = useRef<string>("");
  const executingPendingTaskIdRef = useRef<string | null>(null);
  const executionStartTimeRef = useRef<number>(0);
  const executionStepsCountRef = useRef<number>(0);
  const liveExecutionStepsRef = useRef<ExecutionStepDetail[]>([]);
  const lastObservationRef = useRef<PageObservation | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchProfiles = async () => {
    try {
      const res = await fetch("http://127.0.0.1:3001/profiles");
      if (res.ok) {
        const data = (await res.json()) as { profiles: UserProfile[]; defaultProfileId: string };
        if (Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
          localStorage.setItem("difm_saved_user_profiles", JSON.stringify(data.profiles));
          if (!activeProfileId || !data.profiles.some((p) => p.id === activeProfileId)) {
            const nextActive = data.defaultProfileId || data.profiles[0]?.id || "profile-personal";
            setActiveProfileId(nextActive);
            localStorage.setItem("difm_active_profile_id", nextActive);
          }
        }
      }
    } catch {
      // Retain cached profiles
    }
  };

  const handleSelectActiveProfile = (id: string) => {
    setActiveProfileId(id);
    localStorage.setItem("difm_active_profile_id", id);
    setIsProfileDropdownOpen(false);
    const prof = profiles.find((p) => p.id === id);
    if (prof) {
      if (prof.firstName) {
        setBillerFirstName(prof.firstName);
        localStorage.setItem("difm_user_first_name", prof.firstName);
      }
      if (prof.lastName) {
        setBillerLastName(prof.lastName);
        localStorage.setItem("difm_user_last_name", prof.lastName);
      }
      if (prof.phone) {
        setBillerPhone(prof.phone);
        localStorage.setItem("difm_user_phone", prof.phone);
      }
      if (prof.email) {
        setBillerEmail(prof.email);
        localStorage.setItem("difm_user_email", prof.email);
      }
    }
  };

  const handleSetDefaultProfile = async (id: string) => {
    const updated = profiles.map((p) => ({
      ...p,
      isDefault: p.id === id
    }));
    setProfiles(updated);
    localStorage.setItem("difm_saved_user_profiles", JSON.stringify(updated));

    try {
      const res = await fetch(`http://127.0.0.1:3001/profiles/${id}/set-default`, {
        method: "POST"
      });
      if (res.ok) {
        fetchProfiles();
      }
    } catch {}
  };

  const handleOpenCreateProfile = () => {
    setEditingProfile(null);
    setIsCreatingNewProfile(true);
    setProfLabel("");
    setProfIcon("user");
    setProfColor("indigo");
    setProfFirstName("");
    setProfLastName("");
    setProfEmail("");
    setProfPhone("");
    setProfStreet("");
    setProfCity("");
    setProfState("");
    setProfPostalCode("");
    setProfCountry("");
    setProfCompanyName("");
    setProfTaxId("");
    setProfDepartment("");
    setProfDesignation("");
    setProfNotes("");
    setProfCustomAttrs([]);
    setIsProfileVaultModalOpen(true);
    setIsProfileDropdownOpen(false);
  };

  const handleOpenEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    setIsCreatingNewProfile(false);
    setProfLabel(profile.label || "");
    setProfIcon(profile.icon || "user");
    setProfColor(profile.color || "indigo");
    setProfFirstName(profile.firstName || "");
    setProfLastName(profile.lastName || "");
    setProfEmail(profile.email || "");
    setProfPhone(profile.phone || "");
    setProfStreet(profile.address?.street || "");
    setProfCity(profile.address?.city || "");
    setProfState(profile.address?.state || "");
    setProfPostalCode(profile.address?.postalCode || "");
    setProfCountry(profile.address?.country || "");
    setProfCompanyName(profile.business?.companyName || "");
    setProfTaxId(profile.business?.taxIdOrGst || "");
    setProfDepartment(profile.business?.department || "");
    setProfDesignation(profile.business?.designation || "");
    setProfNotes(profile.notes || "");
    const attrs = profile.customAttributes
      ? Object.entries(profile.customAttributes).map(([k, v]) => ({ key: k, value: v }))
      : [];
    setProfCustomAttrs(attrs);
    setIsProfileVaultModalOpen(true);
    setIsProfileDropdownOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!profLabel.trim()) return;

    const customAttributes: Record<string, string> = {};
    profCustomAttrs.forEach((attr) => {
      if (attr.key.trim() && attr.value.trim()) {
        customAttributes[attr.key.trim()] = attr.value.trim();
      }
    });

    const now = Date.now();
    let updatedProfile: UserProfile;

    if (editingProfile) {
      updatedProfile = {
        ...editingProfile,
        label: profLabel.trim(),
        icon: profIcon,
        color: profColor,
        firstName: profFirstName.trim(),
        lastName: profLastName.trim(),
        email: profEmail.trim(),
        phone: profPhone.trim(),
        address: {
          street: profStreet.trim() || undefined,
          city: profCity.trim() || undefined,
          state: profState.trim() || undefined,
          postalCode: profPostalCode.trim() || undefined,
          country: profCountry.trim() || undefined
        },
        business: {
          companyName: profCompanyName.trim() || undefined,
          taxIdOrGst: profTaxId.trim() || undefined,
          department: profDepartment.trim() || undefined,
          designation: profDesignation.trim() || undefined
        },
        customAttributes,
        notes: profNotes.trim() || undefined,
        updatedAt: now
      };
    } else {
      updatedProfile = {
        id: `profile-${now}-${Math.random().toString(36).slice(2, 7)}`,
        label: profLabel.trim(),
        isDefault: profiles.length === 0,
        icon: profIcon,
        color: profColor,
        firstName: profFirstName.trim(),
        lastName: profLastName.trim(),
        email: profEmail.trim(),
        phone: profPhone.trim(),
        address: {
          street: profStreet.trim() || undefined,
          city: profCity.trim() || undefined,
          state: profState.trim() || undefined,
          postalCode: profPostalCode.trim() || undefined,
          country: profCountry.trim() || undefined
        },
        business: {
          companyName: profCompanyName.trim() || undefined,
          taxIdOrGst: profTaxId.trim() || undefined,
          department: profDepartment.trim() || undefined,
          designation: profDesignation.trim() || undefined
        },
        customAttributes,
        notes: profNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now
      };
    }

    // 1. Immediately update state and localStorage so changes are never lost
    let nextProfiles: UserProfile[];
    if (editingProfile) {
      nextProfiles = profiles.map((p) => (p.id === editingProfile.id ? updatedProfile : p));
    } else {
      nextProfiles = [...profiles, updatedProfile];
      setActiveProfileId(updatedProfile.id);
      localStorage.setItem("difm_active_profile_id", updatedProfile.id);
    }
    setProfiles(nextProfiles);
    localStorage.setItem("difm_saved_user_profiles", JSON.stringify(nextProfiles));

    // If editing the active profile or personal identity, sync contact states
    if (editingProfile ? editingProfile.id === activeProfileId : true) {
      if (profFirstName.trim()) {
        setBillerFirstName(profFirstName.trim());
        localStorage.setItem("difm_user_first_name", profFirstName.trim());
      }
      if (profLastName.trim()) {
        setBillerLastName(profLastName.trim());
        localStorage.setItem("difm_user_last_name", profLastName.trim());
      }
      const full = [profFirstName.trim(), profLastName.trim()].filter(Boolean).join(" ");
      if (full) localStorage.setItem("difm_user_name", full);
      if (profPhone.trim()) {
        setBillerPhone(profPhone.trim());
        localStorage.setItem("difm_user_phone", profPhone.trim());
      }
      if (profEmail.trim()) {
        setBillerEmail(profEmail.trim());
        localStorage.setItem("difm_user_email", profEmail.trim());
      }
    }

    setEditingProfile(null);
    setIsCreatingNewProfile(false);

    // 2. Sync to server in background if available
    try {
      if (editingProfile) {
        await fetch(`http://127.0.0.1:3001/profiles/${editingProfile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedProfile)
        });
      } else {
        await fetch("http://127.0.0.1:3001/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedProfile)
        });
      }
      fetchProfiles();
    } catch {}
  };

  const handleDeleteProfile = async (id: string) => {
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    localStorage.setItem("difm_saved_user_profiles", JSON.stringify(remaining));

    if (activeProfileId === id && remaining.length > 0) {
      setActiveProfileId(remaining[0].id);
      localStorage.setItem("difm_active_profile_id", remaining[0].id);
    }

    try {
      await fetch(`http://127.0.0.1:3001/profiles/${id}`, {
        method: "DELETE"
      });
      fetchProfiles();
    } catch {}
  };


  const handleApplyProfileToCreateForm = (profileId: string) => {
    setNewTaskProfileId(profileId);
    const prof = profiles.find((p) => p.id === profileId);
    if (prof) {
      if (prof.firstName) setBillerFirstName(prof.firstName);
      if (prof.lastName) setBillerLastName(prof.lastName);
      if (prof.phone) setBillerPhone(prof.phone);
      if (prof.email) setBillerEmail(prof.email);
    }
  };

  const handleApplyProfileToEditForm = (profileId: string) => {
    setEditProfileId(profileId);
    const prof = profiles.find((p) => p.id === profileId);
    if (prof) {
      if (prof.firstName) setEditFirstName(prof.firstName);
      if (prof.lastName) setEditLastName(prof.lastName);
      if (prof.phone) setEditPhone(prof.phone);
      if (prof.email) setEditEmail(prof.email);
    }
  };


  const fetchPendingTasks = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
      if (priorityFilter !== "ALL") queryParams.set("priority", priorityFilter);
      if (sortBy) queryParams.set("sortBy", sortBy);

      const res = await fetch(`http://127.0.0.1:3001/pending-tasks?${queryParams.toString()}`);
      const data = (await res.json()) as {
        tasks: PendingTaskItem[];
        remindersDue: PendingTaskItem[];
        scheduledReady?: PendingTaskItem[];
      };
      if (Array.isArray(data.tasks)) {
        setPendingTasks(data.tasks);
        setRemindersDue(data.remindersDue || []);
        setScheduledReady(data.scheduledReady || []);
        localStorage.setItem("difm_saved_pending_tasks", JSON.stringify(data.tasks));
      }
    } catch {
      // Retain cached tasks
    }
  };

  const captureTabObservationWithRetry = async (
    tabId: number,
    currentTaskId: string,
    maxAttempts = 8,
    initialDelayMs = 500
  ) => {
    await new Promise((r) => setTimeout(r, initialDelayMs));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("about:")) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        const res = await new Promise<{ success?: boolean; observation?: PageObservation } | null>((resolve) => {
          chrome.tabs.sendMessage(tabId, { type: "CAPTURE_OBSERVATION" }, (response) => {
            if (chrome.runtime.lastError || !response?.observation) {
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });

        if (res?.observation && res.observation.interactiveNodes) {
          lastObservationRef.current = res.observation;
          const nextObsMsg: ExtensionMessage = {
            type: "OBSERVATION_CAPTURED",
            taskId: currentTaskId,
            observation: res.observation
          };
          sendExtensionMessage(nextObsMsg);
          setLogs((prev) => [
            ...prev,
            `Page analyzed (${res.observation!.interactiveNodes.length} interactive elements). Planning action sequence...`
          ]);
          return;
        }

        // Try injecting content script if not ready
        await new Promise<void>((resolve) => {
          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ["content-scripts/content.js"]
            },
            () => {
              // Ignore lastError during page transition
              resolve();
            }
          );
        });

        await new Promise((r) => setTimeout(r, 450));

        const retryRes = await new Promise<{ success?: boolean; observation?: PageObservation } | null>((resolve) => {
          chrome.tabs.sendMessage(tabId, { type: "CAPTURE_OBSERVATION" }, (response) => {
            if (chrome.runtime.lastError || !response?.observation) {
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });

        if (retryRes?.observation && retryRes.observation.interactiveNodes) {
          lastObservationRef.current = retryRes.observation;
          const nextObsMsg: ExtensionMessage = {
            type: "OBSERVATION_CAPTURED",
            taskId: currentTaskId,
            observation: retryRes.observation
          };
          sendExtensionMessage(nextObsMsg);
          setLogs((prev) => [
            ...prev,
            `Page analyzed (${retryRes.observation!.interactiveNodes.length} interactive elements). Planning action sequence...`
          ]);
          return;
        }
      } catch {
        // Retry loop continue
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    setLogs((prev) => [
      ...prev,
      "Please make sure the target webpage is loaded in Chrome, or refresh the tab and click Execute again."
    ]);
  };

  const waitForTabComplete = async (tabId: number): Promise<void> => {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete" && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("about:")) {
        await new Promise((r) => setTimeout(r, 400));
        return;
      }
    } catch {}

    await new Promise<void>((resolve) => {
      const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }, 8000);
    });
    await new Promise((r) => setTimeout(r, 500));
  };

  const openAndPrepareTab = async (targetUrl?: string): Promise<number> => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const currentTab = tabs.find((t) => t.active) || tabs[0];

    // If no targetUrl is provided, or user is executing a prompt directly:
    // ALWAYS reuse the current active tab without creating or navigating away!
    if (!targetUrl || !targetUrl.startsWith("http")) {
      if (currentTab?.id) {
        return currentTab.id;
      }
    }

    // If targetUrl IS provided:
    if (targetUrl && targetUrl.startsWith("http")) {
      let targetDomain = "";
      try {
        targetDomain = new URL(targetUrl).hostname.replace(/^www\./, "");
      } catch {}

      // If any open tab in window already matches this portal domain, activate it directly
      if (targetDomain) {
        const existingTab = tabs.find((t) => t.url && t.url.includes(targetDomain));
        if (existingTab?.id) {
          await chrome.tabs.update(existingTab.id, { active: true });
          await waitForTabComplete(existingTab.id);
          return existingTab.id;
        }
      }

      // If current tab is a blank or new tab, navigate it instead of opening another tab
      if (
        currentTab?.id &&
        (!currentTab.url ||
          currentTab.url.startsWith("chrome://") ||
          currentTab.url.startsWith("about:") ||
          currentTab.url === "https://www.google.com/")
      ) {
        await chrome.tabs.update(currentTab.id, { url: targetUrl });
        await waitForTabComplete(currentTab.id);
        return currentTab.id;
      }

      // Otherwise create a new tab for the target URL
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
      if (!newTab.id) throw new Error("Unable to create browser tab");
      await waitForTabComplete(newTab.id);
      return newTab.id;
    }

    if (currentTab?.id) return currentTab.id;
    const fallbackTab = await chrome.tabs.create({ url: "https://www.google.com", active: true });
    return fallbackTab.id!;
  };

  const setupSocket = () => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return socketRef.current;
    }

    const ws = new WebSocket("ws://127.0.0.1:3001/ws");
    socketRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;

        if (msg.type === "SECURITY_CHALLENGE_DETECTED") {
          setTaskState("HUMAN_TAKEOVER");
          setSecurityChallenge(msg.challenge);
          setLogs((prev) => [...prev, `[Verification Needed]: ${msg.challenge.description}`]);
        } else if (msg.type === "REQUEST_APPROVAL") {
          setTaskState("WAITING_FOR_APPROVAL");
          setApprovalPrompt({
            summary: msg.summary,
            consequences: msg.consequences
          });
          setLogs((prev) => [...prev, `[Action Required]: ${msg.summary}`]);
          chrome.runtime.sendMessage({
            type: "SENSITIVE_APPROVAL_REQUIRED",
            goal: currentGoalRef.current,
            actionType: msg.summary
          }).catch(() => {});
        } else if (msg.type === "EXECUTE_ACTION") {
          setApprovalPrompt(null);
          setSecurityChallenge(null);
          setTaskState("EXECUTING");
          executionStepsCountRef.current += 1;
          const currentStepNum = executionStepsCountRef.current;
          const stepTimestamp = Date.now();
          const obs = lastObservationRef.current;

          let targetName = "";
          let targetRole = "";
          let targetSelector = "";
          let inputValue = "";
          let desc = "";

          const action = msg.action;
          if (action.type === "CLICK") {
            targetName = action.target.name || "";
            targetRole = action.target.role || "";
            targetSelector = action.target.selector || action.target.id || "";
            desc = action.description || `Click on ${targetName || targetRole || "element"}`;
          } else if (action.type === "TYPE") {
            targetName = action.target.name || "";
            targetRole = action.target.role || "";
            targetSelector = action.target.selector || action.target.id || "";
            inputValue = action.maskInput ? "••••••••" : action.text;
            desc = action.description || `Type "${inputValue}" into ${targetName || targetRole || "input"}`;
          } else if (action.type === "SELECT") {
            targetName = action.target.name || "";
            targetRole = action.target.role || "";
            targetSelector = action.target.selector || action.target.id || "";
            inputValue = action.value;
            desc = action.description || `Select "${action.value}" in ${targetName || targetRole || "dropdown"}`;
          } else if (action.type === "NAVIGATE") {
            desc = action.description || `Navigate to ${action.url}`;
          } else if (action.type === "WAIT") {
            desc = `Wait ${action.durationMs}ms (${action.reason})`;
          } else if (action.type === "COMPLETE") {
            desc = action.summary || "Task completed successfully";
          } else if (action.type === "FAIL") {
            desc = action.error || "Action failed";
          } else {
            desc = (action as any).summary || (action as any).prompt || action.type;
          }

          const stepDetail: ExecutionStepDetail = {
            id: `step_${currentStepNum}_${Date.now()}`,
            stepNumber: currentStepNum,
            timestamp: stepTimestamp,
            actionType: action.type,
            description: desc,
            targetName: targetName || undefined,
            targetRole: targetRole || undefined,
            targetSelector: targetSelector || undefined,
            inputValue: inputValue || undefined,
            url: obs?.url || undefined,
            pageTitle: obs?.title || undefined,
            status: action.type === "FAIL" ? "FAILED" : "SUCCESS",
            elementsCount: obs?.interactiveNodes?.length || undefined,
            durationMs: stepTimestamp - (liveExecutionStepsRef.current.slice(-1)[0]?.timestamp || executionStartTimeRef.current)
          };

          liveExecutionStepsRef.current.push(stepDetail);
          setLogs((prev) => [...prev, `Executing: [${msg.action.type}] ${desc}`]);

          if (msg.action.type === "COMPLETE") {
            setTaskState("COMPLETED");
            const summary = msg.action.summary || "Task finished and verified successfully!";
            setLogs((prev) => [...prev, `Task Completed: ${summary}`]);
            setSuccessMessage({
              title: "Task Executed Successfully!",
              summary
            });

            const durationMs = Date.now() - executionStartTimeRef.current;
            const finalSteps = [...liveExecutionStepsRef.current];

            if (executingPendingTaskIdRef.current) {
              try {
                await fetch(`http://127.0.0.1:3001/pending-tasks/${executingPendingTaskIdRef.current}/record-run`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "SUCCESS",
                    durationMs,
                    summary,
                    stepsCount: finalSteps.length,
                    steps: finalSteps
                  })
                });
              } catch {}
            }
            fetchPendingTasks();
            return;
          }
          if (msg.action.type === "FAIL") {
            setTaskState("FAILED");
            const errorText = msg.action.error || "Action execution failed";
            setLogs((prev) => [...prev, `Task Failed: ${errorText}`]);

            const durationMs = Date.now() - executionStartTimeRef.current;
            const finalSteps = [...liveExecutionStepsRef.current];

            if (executingPendingTaskIdRef.current) {
              try {
                await fetch(`http://127.0.0.1:3001/pending-tasks/${executingPendingTaskIdRef.current}/record-run`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "FAILED",
                    durationMs,
                    error: errorText,
                    stepsCount: finalSteps.length,
                    steps: finalSteps
                  })
                });
              } catch {}
            }
            fetchPendingTasks();
            return;
          }

          let activeTabId = executionTabIdRef.current;
          if (!activeTabId) {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            activeTabId = tab?.id || null;
          }

          if (activeTabId) {
            chrome.tabs.sendMessage(
              activeTabId,
              {
                type: "EXECUTE_ACTION",
                action: msg.action
              },
              (res) => {
                if (chrome.runtime.lastError) {
                  // Navigation, form submission or page reload closed the message channel
                  setLogs((prev) => [...prev, `Page updated / submitted. Capturing next page state...`]);
                  if (msg.taskId && activeTabId) {
                    captureTabObservationWithRetry(activeTabId, msg.taskId);
                  }
                  return;
                }

                if (res?.observation && msg.taskId) {
                  const nextObsMsg: ExtensionMessage = {
                    type: "OBSERVATION_CAPTURED",
                    taskId: msg.taskId,
                    observation: res.observation
                  };
                  sendExtensionMessage(nextObsMsg);
                  setLogs((prev) => [
                    ...prev,
                    `Page observed (${res.observation.interactiveNodes?.length || 0} interactive elements). Planning next step...`
                  ]);
                } else if (msg.taskId && activeTabId) {
                  captureTabObservationWithRetry(activeTabId, msg.taskId);
                }
              }
            );
          }
        }
      } catch {
        setLogs((prev) => [...prev, "Error parsing server message"]);
      }
    };

    ws.onclose = () => {
      // Reconnect handled on-demand
    };

    return ws;
  };

  const sendExtensionMessage = (msg: ExtensionMessage) => {
    const ws = setupSocket();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      ws.onopen = () => {
        ws.send(JSON.stringify(msg));
      };
    }
  };

  useEffect(() => {
    setupSocket();
    fetchProfiles();
    fetchPendingTasks();

    const handleRuntimeMessage = (message: any) => {
      if (message.type === "TRIGGER_DUE_TASK" && message.task) {
        setActiveTab("EXECUTE");
        handleExecutePendingTask(message.task);
      }
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    fetchPendingTasks();
  }, [searchQuery, statusFilter, priorityFilter, sortBy]);

  useEffect(() => {
    let timer: any = null;
    if (isReplayPlaying) {
      const intervalMs = Math.max(400, Math.round(1500 / (replayPlaybackSpeed || 1)));
      timer = setInterval(() => {
        setSelectedStepIndex((prev) => {
          if (prev >= replaySteps.length - 1) {
            setIsReplayPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isReplayPlaying, replayPlaybackSpeed, replaySteps.length]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartTask = async (customGoal?: string, customTargetUrl?: string, pendingTaskId?: string) => {
    let taskGoal = customGoal || goal;
    if (!taskGoal.trim()) return;

    // Inject active profile credentials if executing a raw user prompt
    const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
    if (!customGoal && activeProfile) {
      const parts: string[] = [];
      if (activeProfile.firstName) parts.push(`First Name: ${activeProfile.firstName}`);
      if (activeProfile.lastName) parts.push(`Last Name: ${activeProfile.lastName}`);
      const fullName = [activeProfile.firstName, activeProfile.lastName].filter(Boolean).join(" ");
      if (fullName) parts.push(`Full Name: ${fullName}`);
      if (activeProfile.email) parts.push(`Email: ${activeProfile.email}`);
      if (activeProfile.phone) parts.push(`Phone: ${activeProfile.phone}`);
      if (activeProfile.address?.street) parts.push(`Street: ${activeProfile.address.street}`);
      if (activeProfile.address?.city) parts.push(`City: ${activeProfile.address.city}`);
      if (activeProfile.address?.state) parts.push(`State: ${activeProfile.address.state}`);
      if (activeProfile.address?.postalCode) parts.push(`Postal/PIN Code: ${activeProfile.address.postalCode}`);
      if (activeProfile.address?.country) parts.push(`Country: ${activeProfile.address.country}`);
      if (activeProfile.business?.companyName) parts.push(`Company: ${activeProfile.business.companyName}`);
      if (activeProfile.business?.taxIdOrGst) parts.push(`GST/Tax ID: ${activeProfile.business.taxIdOrGst}`);
      if (activeProfile.business?.designation) parts.push(`Designation: ${activeProfile.business.designation}`);
      if (activeProfile.customAttributes) {
        for (const [k, v] of Object.entries(activeProfile.customAttributes)) {
          if (k && v) parts.push(`${k}: ${v}`);
        }
      }
      if (parts.length > 0) {
        taskGoal = `${taskGoal}. Identity Profile (${activeProfile.label}): [${parts.join(", ")}]. Clear and override any demo or placeholder fields with these credentials.`;
      }
    }

    setLogs([]);
    setTaskState("PLANNING");
    setSecurityChallenge(null);
    setApprovalPrompt(null);
    setSuccessMessage(null);
    currentGoalRef.current = taskGoal;
    executingPendingTaskIdRef.current = pendingTaskId || null;
    executionStartTimeRef.current = Date.now();
    executionStepsCountRef.current = 0;
    liveExecutionStepsRef.current = [];

    try {
      const tabId = await openAndPrepareTab(customTargetUrl);
      executionTabIdRef.current = tabId;

      setLogs((prev) => [...prev, `Navigated to target portal. Initializing autonomous agent...`]);

      const res = await fetch("http://127.0.0.1:3001/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: taskGoal })
      });

      if (!res.ok) {
        throw new Error("Failed to start task on server");
      }


      const data = (await res.json()) as { taskId: string; state: TaskState };
      setTaskId(data.taskId);

      // Resilient initial observation capture
      await captureTabObservationWithRetry(tabId, data.taskId, 8, 400);
    } catch {
      setLogs((prev) => [...prev, "Error: Could not connect to backend server. Make sure `pnpm dev` is running."]);
    }
  };

  const handleDecision = (approved: boolean) => {
    if (!taskId) return;

    const approvalMsg: ExtensionMessage = {
      type: "USER_APPROVAL_RESPONSE",
      taskId,
      approved
    };
    sendExtensionMessage(approvalMsg);
    setApprovalPrompt(null);
    setLogs((prev) => [...prev, approved ? "Action approved by user." : "Action rejected by user."]);
  };

  const handleStopTask = async () => {
    setTaskState("CANCELLED");
    setApprovalPrompt(null);
    setSecurityChallenge(null);
    setLogs((prev) => [...prev, "Task execution terminated by user."]);

    const durationMs = Date.now() - executionStartTimeRef.current;
    const finalSteps = [...liveExecutionStepsRef.current];

    if (executingPendingTaskIdRef.current) {
      try {
        await fetch(`http://127.0.0.1:3001/pending-tasks/${executingPendingTaskIdRef.current}/record-run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "CANCELLED",
            durationMs,
            error: "Task terminated by user",
            stepsCount: finalSteps.length,
            steps: finalSteps
          })
        });
      } catch {}
      fetchPendingTasks();
    }
  };

  const handleResumeAfterChallenge = async () => {
    if (!taskId) return;
    setSecurityChallenge(null);
    setTaskState("PLANNING");
    setLogs((prev) => [...prev, "Verification resolved. Resuming automated workflow..."]);

    const resumeMsg: ExtensionMessage = {
      type: "SECURITY_CHALLENGE_RESOLVED",
      taskId
    };
    sendExtensionMessage(resumeMsg);

    let activeTabId = executionTabIdRef.current;
    if (!activeTabId) {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      activeTabId = tab?.id || null;
    }

    if (activeTabId) {
      setTimeout(() => {
        chrome.tabs.sendMessage(activeTabId!, { type: "CAPTURE_OBSERVATION" }, (obsRes) => {
          if (obsRes?.observation) {
            const nextObsMsg: ExtensionMessage = {
              type: "OBSERVATION_CAPTURED",
              taskId,
              observation: obsRes.observation
            };
            sendExtensionMessage(nextObsMsg);
          }
        });
      }, 500);
    }
  };

  const handleOpenEditTask = (task: PendingTaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title || "");
    setEditPriority(task.priority || "MEDIUM");
    setEditCategory(task.category || "GENERAL");
    setEditBillingCycle(task.billerInfo?.billingCycle || "MONTHLY");
    setEditDueDate(task.dueDate || "");
    setEditNotes(task.notes || "");
    setEditPortalUrl(task.billerInfo?.portalUrl || task.targetUrl || "");
    setEditProvider(task.billerInfo?.providerName || "");
    setEditConsumerNo(task.billerInfo?.consumerNumber || "");
    setEditAmount(task.billerInfo?.amount || "");
    setEditSubdivision(task.billerInfo?.subdivision || "");
    setEditFirstName(
      task.billerInfo?.firstName ||
      (task.billerInfo?.customerName ? task.billerInfo.customerName.split(" ")[0] : "")
    );
    setEditLastName(
      task.billerInfo?.lastName ||
      (task.billerInfo?.customerName ? task.billerInfo.customerName.split(" ").slice(1).join(" ") : "")
    );
    setEditPhone(task.billerInfo?.phoneNumber || "");
    setEditEmail(task.billerInfo?.emailAddress || "");
    setEditInstructions(task.billerInfo?.additionalInstructions || "");

    if (task.schedule && task.schedule.enabled) {
      setEditScheduleEnabled(true);
      setEditScheduleFreq(task.schedule.frequency || "MONTHLY");
      setEditScheduleTime(task.schedule.time || "09:30");
      setEditScheduleDayOfMonth(task.schedule.dayOfMonth ?? 5);
      setEditScheduleDayOfWeek(task.schedule.dayOfWeek ?? 1);
      setEditScheduleIntervalDays(task.schedule.intervalDays ?? 3);
      setEditScheduleAutoExecute(task.schedule.autoExecute !== false);
    } else {
      setEditScheduleEnabled(false);
      setEditScheduleFreq("MONTHLY");
      setEditScheduleTime("09:30");
      setEditScheduleDayOfMonth(5);
      setEditScheduleDayOfWeek(1);
      setEditScheduleIntervalDays(3);
      setEditScheduleAutoExecute(true);
    }
  };

  const handleSaveEditTask = async () => {
    if (!editingTask || !editTitle.trim()) return;

    try {
      const updatedFullName = [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(" ");
      const billerInfo = {
        providerName: editProvider.trim() || undefined,
        billType: editCategory,
        billingCycle: editBillingCycle,
        consumerNumber: editConsumerNo.trim() || undefined,
        amount: editAmount.trim() || undefined,
        subdivision: editSubdivision.trim() || undefined,
        portalUrl: editPortalUrl.trim() || undefined,
        firstName: editFirstName.trim() || undefined,
        lastName: editLastName.trim() || undefined,
        customerName: updatedFullName || undefined,
        phoneNumber: editPhone.trim() || undefined,
        emailAddress: editEmail.trim() || undefined,
        additionalInstructions: editInstructions.trim() || undefined
      };

      const schedule = editScheduleEnabled
        ? {
            enabled: true,
            frequency: editScheduleFreq,
            time: editScheduleTime,
            dayOfMonth: editScheduleFreq === "MONTHLY" ? Number(editScheduleDayOfMonth) : undefined,
            dayOfWeek: editScheduleFreq === "WEEKLY" ? Number(editScheduleDayOfWeek) : undefined,
            intervalDays: editScheduleFreq === "CUSTOM_DAYS" ? Number(editScheduleIntervalDays) : undefined,
            autoExecute: editScheduleAutoExecute
          }
        : {
            enabled: false,
            frequency: "ONCE" as ScheduleFrequency,
            autoExecute: false
          };

      await fetch(`http://127.0.0.1:3001/pending-tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          priority: editPriority,
          category: editCategory,
          dueDate: editDueDate || null,
          notes: editNotes.trim() || null,
          targetUrl: editPortalUrl.trim() || null,
          billerInfo,
          schedule
        })
      });

      if (editFirstName.trim()) localStorage.setItem("difm_user_first_name", editFirstName.trim());
      if (editLastName.trim()) localStorage.setItem("difm_user_last_name", editLastName.trim());
      if (updatedFullName) localStorage.setItem("difm_user_name", updatedFullName);
      if (editPhone.trim()) localStorage.setItem("difm_user_phone", editPhone.trim());
      if (editEmail.trim()) localStorage.setItem("difm_user_email", editEmail.trim());

      setEditingTask(null);
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleCreatePendingTask = async (opts?: { customTitle?: string; andRun?: boolean }) => {
    const finalTitle = (opts?.customTitle || newTaskTitle || (billerProvider ? `Pay ${billerProvider} ${billerBillingCycle === "MONTHLY" ? "Monthly " : ""}Bill` : "Scheduled Utility Task")).trim();
    if (!finalTitle) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const customerFullName = [billerFirstName.trim(), billerLastName.trim()].filter(Boolean).join(" ");
      const billerInfo = showBillerDetails
        ? {
            providerName: billerProvider.trim() || undefined,
            billType: billerType,
            billingCycle: billerBillingCycle,
            consumerNumber: billerConsumerNo.trim() || undefined,
            amount: billerAmount.trim() || undefined,
            subdivision: billerSubdivision.trim() || undefined,
            portalUrl: billerPortalUrl.trim() || undefined,
            firstName: billerFirstName.trim() || undefined,
            lastName: billerLastName.trim() || undefined,
            customerName: customerFullName || undefined,
            phoneNumber: billerPhone.trim() || undefined,
            emailAddress: billerEmail.trim() || undefined,
            additionalInstructions: billerInstructions.trim() || undefined
          }
        : undefined;

      const schedule = scheduleEnabled
        ? {
            enabled: true,
            frequency: scheduleFreq,
            time: scheduleTime,
            dayOfMonth: scheduleFreq === "MONTHLY" ? Number(scheduleDayOfMonth) : undefined,
            dayOfWeek: scheduleFreq === "WEEKLY" ? Number(scheduleDayOfWeek) : undefined,
            intervalDays: scheduleFreq === "CUSTOM_DAYS" ? Number(scheduleIntervalDays) : undefined,
            autoExecute: scheduleAutoExecute
          }
        : undefined;

      await fetch("http://127.0.0.1:3001/pending-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          priority: newTaskPriority,
          category: billerType,
          dueDate: newTaskDueDate || undefined,
          notes: newTaskNotes.trim() || undefined,
          targetUrl: billerPortalUrl.trim() || tab?.url || undefined,
          schedule,
          billerInfo
        })
      });

      if (billerFirstName) localStorage.setItem("difm_user_first_name", billerFirstName);
      if (billerLastName) localStorage.setItem("difm_user_last_name", billerLastName);
      if (customerFullName) localStorage.setItem("difm_user_name", customerFullName);
      if (billerPhone) localStorage.setItem("difm_user_phone", billerPhone);
      if (billerEmail) localStorage.setItem("difm_user_email", billerEmail);

      const savedTitle = finalTitle;
      const savedProvider = billerProvider;
      const savedCycle = billerBillingCycle;
      const savedType = billerType;
      const savedPortalUrl = billerPortalUrl;
      const savedConsumerNo = billerConsumerNo;
      const savedAmount = billerAmount;

      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskNotes("");
      setBillerProvider("");
      setBillerConsumerNo("");
      setBillerAmount("");
      setBillerSubdivision("");
      setBillerPortalUrl("");
      setBillerInstructions("");
      setShowBillerDetails(false);
      setShowScheduleDetails(false);
      setScheduleEnabled(false);
      setIsCreateOpen(false);
      setExtractSuccess(null);
      await fetchPendingTasks();

      if (opts?.andRun) {
        const goalPrompt = `Pay ${savedType.toLowerCase()} ${savedCycle.toLowerCase()} bill for ${savedProvider || savedTitle}. Details: First Name: ${billerFirstName} | Last Name: ${billerLastName} | Account/Consumer ID: ${savedConsumerNo} | Bill Amount: ${savedAmount} | Billing Timeline: ${savedCycle} Bill. Select the payment link matching this billing cycle (${savedCycle}). Stop and request user confirmation before final payment/card submission.`;
        setActiveTab("EXECUTE");
        setGoal(goalPrompt);
        handleStartTask(goalPrompt, savedPortalUrl || undefined);
      } else {
        setSuccessMessage({
          title: "Task Saved to Pending Tasks",
          summary: `"${savedTitle}" was saved successfully and is ready for future runs or automated scheduling.`
        });
      }
    } catch {
      // Ignored
    }
  };

  const handleSaveCurrentGoalAsTask = async () => {
    if (!goal.trim()) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
      const customerFullName = [currentActiveProfile?.firstName, currentActiveProfile?.lastName].filter(Boolean).join(" ");
      const autoTitle = goal.length > 55 ? goal.slice(0, 52).trim() + "..." : goal.trim();

      await fetch("http://127.0.0.1:3001/pending-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: autoTitle,
          priority: "HIGH",
          category: "GENERAL",
          notes: goal.trim(),
          targetUrl: tab?.url || undefined,
          billerInfo: {
            firstName: currentActiveProfile?.firstName || undefined,
            lastName: currentActiveProfile?.lastName || undefined,
            customerName: customerFullName || undefined,
            phoneNumber: currentActiveProfile?.phone || undefined,
            emailAddress: currentActiveProfile?.email || undefined
          }
        })
      });

      setSuccessMessage({
        title: "Task Saved Successfully",
        summary: `Goal "${autoTitle}" has been saved to your Tasks tab for future one-click runs.`
      });
      fetchPendingTasks();
    } catch (e) {
      console.error("Failed to save goal as task:", e);
    }
  };

  const handleSmartFormatAndSchedule = async () => {
    if (!goal.trim()) return;
    setIsFormattingTask(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
      const res = await fetch("http://127.0.0.1:3001/parse-rough-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawGoal: goal.trim(),
          currentUrl: tab?.url,
          userProfile: currentActiveProfile
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setParsedTaskDraft(data.result);
          setIsSmartSchedulerOpen(true);
        }
      }
    } catch (e) {
      console.error("Smart format failed:", e);
    } finally {
      setIsFormattingTask(false);
    }
  };

  const handleConfirmSmartScheduledTask = async (andRun = false) => {
    if (!parsedTaskDraft) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
      const customerFullName = [currentActiveProfile?.firstName, currentActiveProfile?.lastName].filter(Boolean).join(" ");

      const billerInfo = {
        providerName: parsedTaskDraft.providerName || undefined,
        billType: parsedTaskDraft.category,
        billingCycle: parsedTaskDraft.billingCycle,
        consumerNumber: parsedTaskDraft.consumerNumber || undefined,
        amount: parsedTaskDraft.dueAmount || undefined,
        portalUrl: parsedTaskDraft.targetUrl || undefined,
        firstName: currentActiveProfile?.firstName || undefined,
        lastName: currentActiveProfile?.lastName || undefined,
        customerName: customerFullName || undefined,
        phoneNumber: currentActiveProfile?.phone || undefined,
        emailAddress: currentActiveProfile?.email || undefined,
        additionalInstructions: parsedTaskDraft.formattedGoal
      };

      const res = await fetch("http://127.0.0.1:3001/pending-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsedTaskDraft.title,
          priority: "HIGH",
          category: parsedTaskDraft.category,
          dueDate: parsedTaskDraft.dueDate || undefined,
          notes: parsedTaskDraft.formattedGoal,
          targetUrl: parsedTaskDraft.targetUrl || tab?.url || undefined,
          schedule: parsedTaskDraft.schedule,
          billerInfo
        })
      });

      if (res.ok) {
        setIsSmartSchedulerOpen(false);
        setSuccessMessage({
          title: "Task Formatted & Scheduled Successfully",
          summary: `"${parsedTaskDraft.title}" has been structured and added to your schedules. Sensitive actions will pause for your confirmation.`
        });
        fetchPendingTasks();

        if (andRun) {
          setActiveTab("EXECUTE");
          setGoal(parsedTaskDraft.formattedGoal);
          handleStartTask(parsedTaskDraft.formattedGoal, parsedTaskDraft.targetUrl || undefined);
        }
      }
    } catch (e) {
      console.error("Failed to save scheduled task:", e);
    }
  };

  // Sync saved rough notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("difm_saved_rough_notes", JSON.stringify(savedNotes));
    } catch (e) {
      console.error("Failed to persist saved notes:", e);
    }
  }, [savedNotes]);

  // Smart Notes Action Handlers
  const handleAnalyzeRawNote = async (textToParse?: string, forceNew = false) => {
    const raw = (typeof textToParse === "string" ? textToParse : noteInput || "").trim();
    if (!raw) return;
    setIsNoteAnalyzing(true);
    let draft: RawNoteItem["parsedDraft"] | null = null;
    try {
      let currentTabUrl: string | undefined = undefined;

      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        currentTabUrl = tab?.url;
      } catch {}

      try {
        const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
        const res = await fetch("http://127.0.0.1:3001/parse-rough-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawGoal: raw,
            currentUrl: currentTabUrl,
            userProfile: currentActiveProfile
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            draft = data.result;
          }
        }
      } catch (err) {
        console.warn("Backend parse-rough-task unavailable, using local parser:", err);
      }

      // Local heuristic fallback parser if backend is offline/slow
      if (!draft) {
        let category: TaskCategory = "GENERAL";
        let providerName: string | undefined = undefined;
        let portalUrl = currentTabUrl || "";
        let priceCondition: import("@difm/shared").PriceCondition | undefined = undefined;

        const isCommerce =
          /amazon|flipkart|myntra|meesho|ajio|croma|price\s*drop|track\s*price|when\s*price|below\s*(?:₹|rs\.?|\$)?\s*\d+|under\s*(?:₹|rs\.?|\$)?\s*\d+/i.test(
            raw
          ) || (portalUrl && /amazon\.|flipkart\.|myntra\.|meesho\.|ajio\./i.test(portalUrl));

        if (isCommerce) {
          category = "COMMERCE_WATCH";
          if (/amazon/i.test(raw) || /amazon\./i.test(portalUrl)) {
            providerName = "Amazon";
            if (!portalUrl) portalUrl = "https://www.amazon.in";
          } else if (/flipkart/i.test(raw) || /flipkart\./i.test(portalUrl)) {
            providerName = "Flipkart";
            if (!portalUrl) portalUrl = "https://www.flipkart.com";
          } else if (/myntra/i.test(raw) || /myntra\./i.test(portalUrl)) {
            providerName = "Myntra";
            if (!portalUrl) portalUrl = "https://www.myntra.com";
          } else {
            providerName = "Shopping Store";
          }

          const targetMatch =
            raw.match(/(?:below|under|drops?\s+to|target|reach(?:es)?)\s*(?:rs\.?|inr|₹|\$)?\s*([\d,]+)/i) ||
            raw.match(/(?:rs\.?|inr|₹|\$)\s*([\d,]+)\s*(?:or\s+(?:below|less)|target)/i);
          const currentMatch = raw.match(/(?:currently|current\s+price|now\s+at)\s*(?:rs\.?|inr|₹|\$)?\s*([\d,]+)/i);

          const targetPrice = targetMatch ? parseFloat(targetMatch[1].replace(/,/g, "")) : undefined;
          const currentPrice = currentMatch ? parseFloat(currentMatch[1].replace(/,/g, "")) : undefined;

          priceCondition = {
            targetPrice,
            currentPrice,
            currency: "INR",
            checkIntervalMinutes: 30,
            autoAddToCart: true,
            autoProceedToCheckout: true,
            priceMatched: false
          };
        } else if (/cesc/i.test(raw)) {
          category = "ELECTRICITY";
          providerName = "CESC Electricity";
          portalUrl = "https://www.cesc.co.in";
        } else if (/bescom/i.test(raw)) {
          category = "ELECTRICITY";
          providerName = "BESCOM Electricity";
          portalUrl = "https://www.bescom.co.in";
        } else if (/tata power/i.test(raw)) {
          category = "ELECTRICITY";
          providerName = "Tata Power";
        } else if (/electricity|power|wbsedcl/i.test(raw)) {
          category = "ELECTRICITY";
          providerName = "Electricity Board";
        } else if (/airtel/i.test(raw)) {
          category = /broadband|wifi|fiber/i.test(raw) ? "INTERNET" : "MOBILE";
          providerName = "Airtel";
          portalUrl = "https://www.airtel.in";
        } else if (/jio/i.test(raw)) {
          category = /fiber|broadband|wifi/i.test(raw) ? "INTERNET" : "MOBILE";
          providerName = "Jio";
          portalUrl = "https://www.jio.com";
        } else if (/broadband|internet|wifi/i.test(raw)) {
          category = "INTERNET";
          providerName = "Internet Provider";
        } else if (/credit card|hdfc|sbi card|icici card/i.test(raw)) {
          category = "CREDIT_CARD";
          providerName = "Credit Card Bill";
        } else if (/water/i.test(raw)) {
          category = "WATER";
          providerName = "Water Department";
        }

        const numMatch = raw.match(/\b(\d{6,18})\b/);
        const amtMatch =
          raw.match(/(?:rs\.?|inr|₹|\$|bill\s+of|amount\s+of|amount\s*:?|amt\s*:?|of)\s*([\d,]+(?:\.\d{2})?)/i) ||
          raw.match(/\b([\d,]+(?:\.\d{2})?)\s*(?:rs|rupees|inr)\b/i);
        const dateMatch = raw.match(/(?:by|before|on|due)?\s*((\d{4}[-/.]\d{2}[-/.]\d{2})|(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{0,4}))/i);

        const missing: Array<"consumerNumber" | "providerName" | "dueAmount" | "targetUrl" | "dueDate"> = [];
        if (!numMatch && category !== "GENERAL" && category !== "COMMERCE_WATCH") missing.push("consumerNumber");
        if (!providerName && !portalUrl) missing.push("providerName");

        let extractedProduct = "";
        if (category === "COMMERCE_WATCH") {
          const cleanRaw = raw
            .replace(/track|watch|monitor|buy|purchase|auto buy|when price drops?|below|under|drops?\s+to|target|reach(?:es)?|currently|current\s+price|now\s+at|(?:₹|rs\.?|\$)\s*[\d,]+|\(.*?\)/gi, " ")
            .replace(/on\s+(?:amazon(?:\.in)?|flipkart(?:\.com)?|myntra(?:\.com)?|meesho|ajio)/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (cleanRaw.length >= 2) {
            extractedProduct = cleanRaw;
          }
        }

        const targetPriceStr = priceCondition?.targetPrice ? `₹${priceCondition.targetPrice.toLocaleString("en-IN")}` : "target price";
        const prodLabel = extractedProduct || "requested product";

        const title = category === "COMMERCE_WATCH"
          ? `Watch Price: ${extractedProduct || providerName || "Product"}${priceCondition?.targetPrice ? ` (Under ₹${priceCondition.targetPrice.toLocaleString("en-IN")})` : ""}`
          : (providerName ? `Pay ${providerName} Bill` : (raw.length > 50 ? raw.slice(0, 47) + "..." : raw));

        const formattedGoal = category === "COMMERCE_WATCH"
          ? `Commerce Price Watch for exact item "${prodLabel}". Search/navigate on ${providerName || "store"} for exact model "${prodLabel}". Locate the matching product link and click to open its product page. Check the live price: if current price is <= ${targetPriceStr}, add item to cart, proceed toward checkout, and pause for user approval. If current price is > ${targetPriceStr}, DO NOT add to cart and report the live price.`
          : `Autonomously navigate to ${portalUrl || "the bill payment portal"}, locate billing account field, verify bill details, and pause for human confirmation before payment.`;

        draft = {
          formattedGoal,
          title,
          category,
          billingCycle: /quarterly/i.test(raw) ? "QUARTERLY" : /yearly/i.test(raw) ? "YEARLY" : (category === "COMMERCE_WATCH" ? "ONE_TIME" : "MONTHLY"),
          dueDate: dateMatch ? dateMatch[1] : undefined,
          dueAmount: amtMatch ? (amtMatch[1].startsWith("₹") ? amtMatch[1] : `₹${amtMatch[1]}`) : (priceCondition?.targetPrice ? `₹${priceCondition.targetPrice.toLocaleString("en-IN")}` : undefined),
          consumerNumber: numMatch ? numMatch[1] : undefined,
          providerName,
          targetUrl: portalUrl || undefined,
          priceCondition,
          schedule: {
            enabled: category === "COMMERCE_WATCH" ? true : /every|monthly|schedule|repeat|daily|weekly/i.test(raw),
            frequency: category === "COMMERCE_WATCH" ? "DAILY" : "MONTHLY",
            time: "09:30",
            dayOfMonth: 5,
            autoExecute: false
          },
          missingFields: missing,
          clarificationPrompt: missing.length > 0 ? `Please provide your ${missing.join(" and ")} to complete this scheduled task.` : undefined,
          requiresHumanApproval: true,
          safetySummary: "Safety Guard: Sensitive payment actions will pause and request your approval before charging."
        };
      }

      if (draft) {
        setActiveNoteDraft(draft);

        const existingIndex = (!forceNew && activeNoteId) ? savedNotes.findIndex((n) => n.id === activeNoteId) : -1;
        const status = draft.missingFields && draft.missingFields.length > 0 ? "NEEDS_CLARIFICATION" : "DRAFT";

        if (existingIndex >= 0) {
          const updated = [...savedNotes];
          updated[existingIndex] = {
            ...updated[existingIndex],
            rawText: raw,
            status,
            parsedDraft: draft
          };
          setSavedNotes(updated);
        } else {
          const newId = "note-" + Date.now();
          setActiveNoteId(newId);
          setSavedNotes([
            {
              id: newId,
              rawText: raw,
              createdAt: Date.now(),
              status,
              parsedDraft: draft
            },
            ...savedNotes
          ]);
        }
      }
    } catch (e) {
      console.error("Failed to analyze raw note:", e);
    } finally {
      setIsNoteAnalyzing(false);
    }
    return draft;
  };

  const handleUpdateNoteDraftField = (field: string, value: any) => {
    if (!activeNoteDraft) return;
    const updated = { ...activeNoteDraft, [field]: value };
    let missing = [...(updated.missingFields || [])];
    if (field === "consumerNumber" && value && value.trim()) {
      missing = missing.filter((f) => f !== "consumerNumber");
    }
    if (field === "providerName" && value && value.trim()) {
      missing = missing.filter((f) => f !== "providerName");
    }
    if (field === "dueAmount" && value && value.trim()) {
      missing = missing.filter((f) => f !== "dueAmount");
    }
    if (field === "dueDate" && value && value.trim()) {
      missing = missing.filter((f) => f !== "dueDate");
    }
    if (field === "targetUrl" && value && value.trim()) {
      missing = missing.filter((f) => f !== "targetUrl");
    }
    updated.missingFields = missing;
    setActiveNoteDraft(updated);

    if (activeNoteId) {
      setSavedNotes((prev) =>
        prev.map((n) =>
          n.id === activeNoteId
            ? {
                ...n,
                status: missing.length > 0 ? "NEEDS_CLARIFICATION" : "DRAFT",
                parsedDraft: updated
              }
            : n
        )
      );
    }
  };

  const handleToggleUrlAttach = async () => {
    const nextState = !isUrlAttachOpen;
    setIsUrlAttachOpen(nextState);
    if (nextState && !customPortalUrl) {
      try {
        let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.url) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          tab = tabs[0];
        }
        if (tab?.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://") && !tab.url.startsWith("about:")) {
          setCustomPortalUrl(tab.url);
          if (activeNoteDraft) {
            handleUpdateNoteDraftField("targetUrl", tab.url);
          }
        }
      } catch (e) {
        console.error("Failed to query tab:", e);
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const trimmed = text.trim();
        setCustomPortalUrl(trimmed);
        if (activeNoteDraft) {
          handleUpdateNoteDraftField("targetUrl", trimmed);
        }
        setAttachedTabNotice(`Pasted URL: ${trimmed.slice(0, 32)}`);
        setTimeout(() => setAttachedTabNotice(null), 3000);
      }
    } catch (e) {
      console.warn("Clipboard read not permitted:", e);
    }
  };

  const handleAutoDetectTabForNote = async () => {
    try {
      let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.url) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = tabs[0];
      }
      if (tab?.url) {
        if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.startsWith("chrome-extension://")) {
          setAttachedTabNotice("Cannot attach browser system page. Open a website first.");
          setTimeout(() => setAttachedTabNotice(null), 3500);
          return;
        }

        let detectedProvider = activeNoteDraft?.providerName;
        if (/cesc/i.test(tab.url)) detectedProvider = "CESC Electricity";
        else if (/airtel/i.test(tab.url)) detectedProvider = "Airtel";
        else if (/bescom/i.test(tab.url)) detectedProvider = "BESCOM";
        else if (/wbsedcl/i.test(tab.url)) detectedProvider = "WBSEDCL";

        setCustomPortalUrl(tab.url);
        setIsUrlAttachOpen(true);

        if (activeNoteDraft) {
          handleUpdateNoteDraftField("targetUrl", tab.url);
          if (detectedProvider && !activeNoteDraft.providerName) {
            handleUpdateNoteDraftField("providerName", detectedProvider);
          }
        }

        setNoteInput((prev) => {
          const cleanUrl = tab.url!;
          if (!prev.trim()) {
            return `Pay bill at ${cleanUrl}`;
          }
          if (prev.includes(cleanUrl)) return prev;
          return `${prev.trim()} (Portal: ${cleanUrl})`;
        });

        const shortUrl = tab.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 32);
        setAttachedTabNotice(`Attached: ${tab.title || shortUrl}`);
        setTimeout(() => setAttachedTabNotice(null), 3500);
      } else {
        setAttachedTabNotice("No active web tab found");
        setTimeout(() => setAttachedTabNotice(null), 3000);
      }
    } catch (e) {
      console.error("Failed to detect tab for note:", e);
      setAttachedTabNotice("Failed to query active tab");
      setTimeout(() => setAttachedTabNotice(null), 3000);
    }
  };

  const handleSaveAndRunCustomUrlNote = async (overrideUrl?: string) => {
    const finalUrl = (overrideUrl !== undefined ? overrideUrl : customPortalUrl || "").trim();
    const rawText = noteInput.trim() || (finalUrl ? `Pay bill at ${finalUrl}` : "Run note automation");
    const fullText = finalUrl && !rawText.includes(finalUrl) ? `${rawText} (Portal: ${finalUrl})` : rawText;

    setIsNoteAnalyzing(true);
    try {
      let draftToUse = activeNoteDraft;
      if (!draftToUse) {
        draftToUse = await handleAnalyzeRawNote(fullText);
      }

      if (draftToUse && finalUrl) {
        draftToUse = { ...draftToUse, targetUrl: finalUrl };
        setActiveNoteDraft(draftToUse);
      }

      const noteId = activeNoteId || "note-" + Date.now();
      setActiveNoteId(noteId);

      setSavedNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === noteId);
        const item: RawNoteItem = {
          id: noteId,
          rawText: fullText,
          createdAt: Date.now(),
          status: "SCHEDULED",
          parsedDraft: draftToUse || undefined
        };
        if (idx >= 0) {
          const cp = [...prev];
          cp[idx] = { ...cp[idx], ...item };
          return cp;
        }
        return [item, ...prev];
      });

      // Also create pending task schedule
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
      const customerFullName = [currentActiveProfile?.firstName, currentActiveProfile?.lastName].filter(Boolean).join(" ");

      const billerInfo = draftToUse
        ? {
            providerName: draftToUse.providerName || undefined,
            billType: draftToUse.category,
            billingCycle: draftToUse.billingCycle,
            consumerNumber: draftToUse.consumerNumber || undefined,
            amount: draftToUse.dueAmount || undefined,
            portalUrl: draftToUse.targetUrl || finalUrl || undefined,
            firstName: currentActiveProfile?.firstName || undefined,
            lastName: currentActiveProfile?.lastName || undefined,
            customerName: customerFullName || undefined,
            phoneNumber: currentActiveProfile?.phone || undefined,
            emailAddress: currentActiveProfile?.email || undefined,
            additionalInstructions: draftToUse.formattedGoal,
            priceCondition: draftToUse.priceCondition
          }
        : undefined;

      try {
        await fetch("http://127.0.0.1:3001/pending-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draftToUse?.title || rawText.slice(0, 40),
            priority: "HIGH",
            category: draftToUse?.category || "GENERAL",
            dueDate: draftToUse?.dueDate || undefined,
            notes: draftToUse?.formattedGoal || fullText,
            targetUrl: draftToUse?.targetUrl || finalUrl || tab?.url || undefined,
            schedule: draftToUse?.schedule || { enabled: true, frequency: "MONTHLY", time: "09:30", dayOfMonth: 5, autoExecute: false },
            billerInfo,
            priceCondition: draftToUse?.priceCondition
          })
        });
        fetchPendingTasks();
      } catch (err) {
        console.warn("Could not sync to backend schedules:", err);
      }

      // Switch to execute tab and run immediately
      setActiveTab("EXECUTE");
      const goalToRun = draftToUse?.formattedGoal || fullText;
      setGoal(goalToRun);
      handleStartTask(goalToRun, draftToUse?.targetUrl || finalUrl || undefined);
    } catch (e) {
      console.error("Failed to save and run note:", e);
    } finally {
      setIsNoteAnalyzing(false);
    }
  };

  const handleScheduleNoteToTasks = async (andRun = false) => {
    if (!activeNoteDraft) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
      const customerFullName = [currentActiveProfile?.firstName, currentActiveProfile?.lastName].filter(Boolean).join(" ");

      const billerInfo = {
        providerName: activeNoteDraft.providerName || undefined,
        billType: activeNoteDraft.category,
        billingCycle: activeNoteDraft.billingCycle,
        consumerNumber: activeNoteDraft.consumerNumber || undefined,
        amount: activeNoteDraft.dueAmount || undefined,
        portalUrl: activeNoteDraft.targetUrl || undefined,
        firstName: currentActiveProfile?.firstName || undefined,
        lastName: currentActiveProfile?.lastName || undefined,
        customerName: customerFullName || undefined,
        phoneNumber: currentActiveProfile?.phone || undefined,
        emailAddress: currentActiveProfile?.email || undefined,
        additionalInstructions: activeNoteDraft.formattedGoal,
        priceCondition: activeNoteDraft.priceCondition
      };

      const res = await fetch("http://127.0.0.1:3001/pending-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeNoteDraft.title,
          priority: "HIGH",
          category: activeNoteDraft.category,
          dueDate: activeNoteDraft.dueDate || undefined,
          notes: activeNoteDraft.formattedGoal,
          targetUrl: activeNoteDraft.targetUrl || tab?.url || undefined,
          schedule: activeNoteDraft.schedule,
          billerInfo,
          priceCondition: activeNoteDraft.priceCondition
        })
      });

      if (res.ok) {
        const data = await res.json();
        const createdTaskId = data.task?.id;

        if (activeNoteId) {
          setSavedNotes((prev) =>
            prev.map((n) =>
              n.id === activeNoteId
                ? {
                    ...n,
                    status: "SCHEDULED",
                    linkedTaskId: createdTaskId,
                    parsedDraft: activeNoteDraft
                  }
                : n
            )
          );
        }

        setSuccessMessage({
          title: "Note Converted & Scheduled Successfully",
          summary: `"${activeNoteDraft.title}" is now added neatly to Tasks & Schedules. Sensitive actions will pause for approval.`
        });
        fetchPendingTasks();

        if (andRun) {
          setActiveTab("EXECUTE");
          setGoal(activeNoteDraft.formattedGoal);
          handleStartTask(activeNoteDraft.formattedGoal, activeNoteDraft.targetUrl || undefined);
        }
      }
    } catch (e) {
      console.error("Failed to schedule from note:", e);
    }
  };

  const handleDeleteNote = (id: string) => {
    setSavedNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setActiveNoteDraft(null);
      setNoteInput("");
    }
  };

  const handleSelectNote = (note: RawNoteItem) => {
    setActiveNoteId(note.id);
    let cleanText = note.rawText;
    let extractedUrl = note.parsedDraft?.targetUrl || "";
    const portalMatch = cleanText.match(/\s*\(Portal:\s*([^\)]+)\)/i);
    if (portalMatch) {
      if (!extractedUrl) extractedUrl = portalMatch[1].trim();
      cleanText = cleanText.replace(portalMatch[0], "").trim();
    }
    setNoteInput(cleanText);
    setCustomPortalUrl(extractedUrl);
    setActiveNoteDraft(note.parsedDraft || null);

    // Focus editor and scroll smoothly to top
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      const el = document.getElementById("smart-note-textarea");
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  const handleExecutePendingTask = async (task: PendingTaskItem) => {
    let formulatedGoal = task.title;
    const targetUrl = task.billerInfo?.portalUrl || task.targetUrl;

    const associatedProfile = task.billerInfo?.profileId
      ? profiles.find((p) => p.id === task.billerInfo?.profileId)
      : profiles.find((p) => p.id === activeProfileId) || profiles[0];

    if (task.billerInfo || associatedProfile) {
      const parts: string[] = [];
      const firstName =
        task.billerInfo?.firstName ||
        (task.billerInfo?.customerName ? task.billerInfo.customerName.split(" ")[0] : "") ||
        associatedProfile?.firstName ||
        billerFirstName;
      const lastName =
        task.billerInfo?.lastName ||
        (task.billerInfo?.customerName ? task.billerInfo.customerName.split(" ").slice(1).join(" ") : "") ||
        associatedProfile?.lastName ||
        billerLastName;
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ") ||
        task.billerInfo?.customerName ||
        [billerFirstName, billerLastName].filter(Boolean).join(" ");
      const phone = task.billerInfo?.phoneNumber || associatedProfile?.phone || billerPhone;
      const email = task.billerInfo?.emailAddress || associatedProfile?.email || billerEmail;

      if (firstName) parts.push(`First Name: ${firstName}`);
      if (lastName) parts.push(`Last Name: ${lastName}`);
      if (fullName) parts.push(`Full Name: ${fullName}`);
      if (phone) parts.push(`Phone No: ${phone}`);
      if (email) parts.push(`Email: ${email}`);

      if (associatedProfile?.address?.street) parts.push(`Street: ${associatedProfile.address.street}`);
      if (associatedProfile?.address?.city) parts.push(`City: ${associatedProfile.address.city}`);
      if (associatedProfile?.address?.state) parts.push(`State: ${associatedProfile.address.state}`);
      if (associatedProfile?.address?.postalCode) parts.push(`Postal/PIN Code: ${associatedProfile.address.postalCode}`);
      if (associatedProfile?.business?.companyName) parts.push(`Company: ${associatedProfile.business.companyName}`);
      if (associatedProfile?.business?.taxIdOrGst) parts.push(`GST/Tax ID: ${associatedProfile.business.taxIdOrGst}`);
      if (associatedProfile?.customAttributes) {
        for (const [k, v] of Object.entries(associatedProfile.customAttributes)) {
          if (k && v) parts.push(`${k}: ${v}`);
        }
      }

      if (task.billerInfo?.providerName) parts.push(`Site/Provider: ${task.billerInfo.providerName}`);
      if (task.billerInfo?.consumerNumber) parts.push(`Account/Consumer ID: ${task.billerInfo.consumerNumber}`);
      if (task.billerInfo?.amount) parts.push(`Bill Amount: ${task.billerInfo.amount}`);
      if (task.billerInfo?.subdivision) parts.push(`Circle/Subdivision: ${task.billerInfo.subdivision}`);
      if (task.billerInfo?.billingCycle) {
        const cycleLabels: Record<BillingCycle, string> = {
          MONTHLY: "Monthly Bill",
          QUARTERLY: "Quarterly Bill",
          YEARLY: "Yearly / Annual Bill",
          ADVANCE: "Advance Payment",
          ONE_TIME: "One-Time Bill",
          CUSTOM: "Custom Timeline"
        };
        parts.push(`Billing Timeline / Option: ${cycleLabels[task.billerInfo.billingCycle] || task.billerInfo.billingCycle}`);
      }
      if (task.billerInfo?.additionalInstructions) parts.push(`Instructions: ${task.billerInfo.additionalInstructions}`);
      if (task.notes) parts.push(`Notes: ${task.notes}`);

      if (
        task.category === "COMMERCE_WATCH" ||
        task.billerInfo?.billType === "COMMERCE_WATCH" ||
        task.priceCondition ||
        task.billerInfo?.priceCondition
      ) {
        const cond = task.priceCondition || task.billerInfo?.priceCondition;
        const targetPriceStr = cond?.targetPrice ? `under ₹${cond.targetPrice.toLocaleString("en-IN")}` : "target threshold";
        formulatedGoal = `Commerce Price Watch for "${task.title}": Navigate to ${targetUrl || "product page"}, search or locate the exact matching model for "${task.title}". Click into the matching product page and check the live price. If price is <= ${targetPriceStr}, add item to cart, proceed to checkout, and PAUSE at final payment screen for human approval. If price is > ${targetPriceStr}, DO NOT add to cart and report the live price.`;
      } else if (
        !task.billerInfo ||
        task.billerInfo.billType === "GENERAL" ||
        task.billerInfo.billType === "FORM_FILL" ||
        task.billerInfo.billType === "OTHER"
      ) {
        formulatedGoal = `Perform form task: "${task.title}". Fill in form fields with User Credentials: [${parts.join(
          ", "
        )}]. Clear and override any demo or sample values with these user values.`;
      } else {
        const cycleTag = task.billerInfo?.billingCycle ? ` (${task.billerInfo.billingCycle.toLowerCase()} timeline)` : "";
        formulatedGoal = `Pay ${task.billerInfo.billType.toLowerCase()}${cycleTag} bill for ${
          task.billerInfo.providerName || task.title
        }. Details: ${parts.join(" | ")}. Select the payment link matching this billing cycle (${task.billerInfo.billingCycle || "MONTHLY"}). Stop and request user confirmation before final payment/card submission.`;
      }
    }

    setGoal(formulatedGoal);
    handleStartTask(formulatedGoal, targetUrl, task.id);
  };


  const handleOpenLiveReplay = () => {
    const steps = [...liveExecutionStepsRef.current];
    setReplayTitle(currentGoalRef.current ? `Live Run: ${currentGoalRef.current}` : "Active Agent Execution");
    setReplayStatus(
      taskState === "COMPLETED"
        ? "SUCCESS"
        : taskState === "FAILED"
        ? "FAILED"
        : taskState === "CANCELLED"
        ? "CANCELLED"
        : "IN_PROGRESS"
    );
    setReplayDurationMs(Date.now() - executionStartTimeRef.current);
    setReplaySteps(steps);
    setSelectedStepIndex(Math.max(0, steps.length - 1));
    setIsReplayPlaying(false);
    setIsReplayModalOpen(true);
  };

  const handleOpenHistoricalReplay = (taskTitle: string, run: import("@difm/shared").TaskExecutionRecord) => {
    let steps = run.steps && run.steps.length > 0 ? run.steps : [];
    if (steps.length === 0) {
      // Synthesize default fallback step if legacy record had no detailed steps
      steps = [
        {
          id: `${run.id}_step1`,
          stepNumber: 1,
          timestamp: run.runAt,
          actionType: run.status === "SUCCESS" ? "COMPLETE" : "FAIL",
          description: run.summary || run.error || "Executed autonomous workflow",
          status: run.status === "SUCCESS" ? "SUCCESS" : "FAILED",
          durationMs: run.durationMs
        }
      ];
    }
    setReplayTitle(`${taskTitle} (${new Date(run.runAt).toLocaleTimeString()})`);
    setReplayStatus(run.status);
    setReplayDurationMs(run.durationMs);
    setReplaySteps(steps);
    setSelectedStepIndex(0);
    setIsReplayPlaying(false);
    setIsReplayModalOpen(true);
  };

  const handleCloneTask = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${id}/clone`, {
        method: "POST"
      });
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: currentNoteText })
      });
      setEditingNotesId(null);
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleToggleTaskStatus = async (task: PendingTaskItem) => {
    const nextStatus = task.status === "COMPLETED" ? (task.schedule?.enabled ? "SCHEDULED" : "PENDING") : "COMPLETED";
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleDeletePendingTask = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${id}`, {
        method: "DELETE"
      });
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const formatScheduleText = (task: PendingTaskItem): string => {
    if (!task.schedule || !task.schedule.enabled) return "";
    const timeStr = task.schedule.time ? ` @ ${task.schedule.time}` : "";
    const autoBadge = task.schedule.autoExecute ? "Auto-runs" : "Reminds";
    switch (task.schedule.frequency) {
      case "DAILY":
        return `${autoBadge} Daily${timeStr}`;
      case "WEEKLY": {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const d = days[task.schedule.dayOfWeek ?? 1];
        return `${autoBadge} Weekly on ${d}${timeStr}`;
      }
      case "MONTHLY":
        return `${autoBadge} Monthly on ${task.schedule.dayOfMonth || 1}th${timeStr}`;
      case "CUSTOM_DAYS":
        return `${autoBadge} Every ${task.schedule.intervalDays || 1}d${timeStr}`;
      case "ONCE":
      default:
        return `${autoBadge} Once${timeStr}`;
    }
  };

  const activeScheduledCount = pendingTasks.filter((t) => t.schedule?.enabled && t.status !== "COMPLETED").length;
  const activePendingCount = pendingTasks.filter((t) => t.status !== "COMPLETED").length;
  const dueSoonCount = pendingTasks.filter((t) => t.status === "DUE_SOON").length;
  const currentAccentStyles = getAccentThemeStyles(accentColor);
  const currentThemeStyles = ACCENT_THEME_OPTIONS.find((t) => t.id === accentColor) || ACCENT_THEME_OPTIONS[0];

  const handleSelectAccentColor = (newAccent: AppAccentColor) => {
    setAccentColor(newAccent);
    localStorage.setItem("difm_theme_accent", newAccent);
  };

  const processBillFile = async (file: File) => {
    setIsExtractingBill(true);
    setExtractError(null);
    setExtractSuccess(null);

    try {
      let textContent = "";
      let imageBase64: string | undefined = undefined;
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isImage) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (isPdf || file.type.includes("text")) {
        // Read text content
        textContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsText(file);
        });
      }

      const res = await fetch("http://127.0.0.1:3001/extract-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textContent || undefined,
          imageBase64: imageBase64 || undefined,
          mimeType: file.type || (isPdf ? "application/pdf" : "image/png"),
          filename: file.name
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = (await res.json()) as { extracted: BillExtractResult };
      const ext = data.extracted;

      if (!ext) {
        throw new Error("Could not parse bill data from file.");
      }

      // Populate form fields
      setIsCreateOpen(true);
      setShowBillerDetails(true);

      const billerTitle = ext.billerName
        ? `Pay ${ext.billerName}${ext.dueAmount ? ` (${ext.dueAmount})` : ""}`
        : `Bill Payment - ${file.name.replace(/\.[^/.]+$/, "")}`;

      setNewTaskTitle(billerTitle);
      if (ext.dueDate) setNewTaskDueDate(ext.dueDate);
      if (ext.billerName) setBillerProvider(ext.billerName);
      if (ext.consumerNumber) setBillerConsumerNo(ext.consumerNumber);
      if (ext.dueAmount) setBillerAmount(ext.dueAmount);
      if (ext.category) setBillerType(ext.category);
      if (ext.billingCycle) setBillerBillingCycle(ext.billingCycle);
      if (ext.portalUrl) setBillerPortalUrl(ext.portalUrl);
      if (ext.customerName) {
        const parts = ext.customerName.split(" ");
        setBillerFirstName(parts[0] || "");
        setBillerLastName(parts.slice(1).join(" ") || "");
      }
      if (ext.notes) {
        setNewTaskNotes(ext.notes);
      } else {
        setNewTaskNotes(`Auto-extracted from ${file.name}`);
      }

      const formulatedGoalText = `Pay ${ext.category ? ext.category.toLowerCase() : "electricity"} ${(ext.billingCycle || "monthly").toLowerCase()} bill for ${ext.billerName || "CESC"}. Details: Customer Name: ${ext.customerName || billerFirstName || ""} | Account/Consumer ID: ${ext.consumerNumber || ""} | Bill Amount: ${ext.dueAmount || ""} | Due Date: ${ext.dueDate || ""} | Billing Timeline: ${ext.billingCycle || "MONTHLY"} Bill. Select the payment link matching this billing cycle (${ext.billingCycle || "MONTHLY"}). Stop and request user confirmation before final payment/card submission.`;
      setGoal(formulatedGoalText);

      setExtractSuccess(
        `Extracted ${ext.billerName || "Bill"}: Consumer #${ext.consumerNumber || "N/A"} | Amt: ${ext.dueAmount || "N/A"} | Due: ${ext.dueDate || "N/A"}`
      );
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Failed to extract bill details";
      if (msg === "Failed to fetch" || msg.includes("fetch")) {
        msg = "Cannot connect to server. Please ensure `pnpm dev` is running.";
      }
      setExtractError(msg);
    } finally {
      setIsExtractingBill(false);
    }
  };

  const handleBillFileUpload = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      processBillFile(file);
      target.value = "";
    }
  };

  const handleBillDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingBill(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processBillFile(file);
    }
  };

  const handleBillPaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/") || items[i].type.includes("pdf")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processBillFile(file);
            break;
          }
        }
      }
    }
  };

  useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      // Intercept image pastes across any tab or input
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/") || items[i].type.includes("pdf")) {
            handleBillPaste(e);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onGlobalPaste);
    return () => window.removeEventListener("paste", onGlobalPaste);
  }, []);

  return (
    <div
      data-accent={accentColor}
      class="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-3 sm:p-4 max-w-full selection:bg-[var(--accent-bg-subtle)] selection:text-[var(--accent-to)]"
    >
      {/* Aceternity ambient glow backdrop */}
      <div class="ambient-glow" />

      {/* Header Section */}
      <header class="relative z-20 flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.08]">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-6 h-6 rounded-lg accent-gradient-bg flex items-center justify-center shadow-glow-sm shrink-0">
            <SparkleIcon size={13} class="text-white" />
          </div>
          <h1 class="text-xs sm:text-sm font-bold text-zinc-100 truncate tracking-tight">
            Do It For Me
          </h1>
        </div>

        {/* Profile Vault Quick Switcher, Live Status & Settings Icon Button */}
        <div class="flex items-center gap-1.5 shrink-0">
          {/* Active Profile Pill Switcher */}
          <div class="relative">
            {(() => {
              const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
              const currentProfileStyles = getProfileColorStyles(currentActiveProfile?.color);
              return (
                <>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    class={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold transition active:scale-95 ${
                      currentProfileStyles.badge
                    } hover:brightness-110`}
                    title="Switch Identity Profile Vault"
                  >
                    <span class={`w-1.5 h-1.5 rounded-full ${currentProfileStyles.dot}`} />
                    <span class="truncate max-w-[76px]">
                      {currentActiveProfile?.label || "Personal"}
                    </span>
                    <CaretDownIcon size={10} class="opacity-70 shrink-0" />
                  </button>

                  {/* Profile Micro-Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div class="absolute right-0 top-full mt-1.5 w-56 glass-panel rounded-xl shadow-2xl border border-white/[0.1] py-1.5 z-50 animate-scale-in">
                      <div class="px-2.5 py-1 border-b border-white/[0.06] flex items-center justify-between">
                        <span class="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                          Identity Vault
                        </span>
                        <span class="text-[9px] text-zinc-500 font-mono">
                          {profiles.length} profiles
                        </span>
                      </div>

                      <div class="max-h-48 overflow-y-auto py-1 space-y-0.5 px-1">
                        {profiles.map((prof) => {
                          const profStyles = getProfileColorStyles(prof.color);
                          const isSelected = prof.id === activeProfileId;
                          return (
                            <button
                              key={prof.id}
                              onClick={() => handleSelectActiveProfile(prof.id)}
                              class={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition ${
                                isSelected
                                  ? "bg-white/[0.08] text-white font-semibold"
                                  : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                              }`}
                            >
                              <div class="flex items-center gap-2 min-w-0">
                                <div
                                  class={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${profStyles.badge}`}
                                >
                                  {renderProfileIcon(prof.icon, 11)}
                                </div>
                                <div class="flex flex-col min-w-0">
                                  <div class="flex items-center gap-1">
                                    <span class="text-xs truncate">{prof.label}</span>
                                    {prof.isDefault && (
                                      <StarIcon size={9} class="text-amber-400 shrink-0 fill-current" />
                                    )}
                                  </div>
                                  <span class="text-[9px] text-zinc-400 truncate font-mono">
                                    {[prof.firstName, prof.lastName].filter(Boolean).join(" ") ||
                                      prof.email ||
                                      "No credentials"}
                                  </span>
                                </div>
                              </div>
                              {isSelected && <CheckIcon size={12} class="accent-text shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>

                      <div class="border-t border-white/[0.06] pt-1 px-1 mt-1 space-y-0.5">
                        <button
                          onClick={handleOpenCreateProfile}
                          class="w-full px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold accent-text hover:bg-[var(--accent-bg-subtle)] flex items-center gap-1.5 transition"
                        >
                          <PlusIcon size={12} />
                          <span>Create New Identity</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setEditingProfile(null);
                            setIsCreatingNewProfile(false);
                            setIsProfileVaultModalOpen(true);
                          }}
                          class="w-full px-2 py-1.5 rounded-lg text-left text-[11px] font-medium text-zinc-300 hover:bg-white/[0.04] hover:text-white flex items-center gap-1.5 transition"
                        >
                          <IdentificationCardIcon size={12} />
                          <span>Manage Vault & Identities</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Feature Hub Dropdown Menu */}
          <div class="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              class={`p-1.5 rounded-lg border transition active:scale-95 shrink-0 ${
                isMoreMenuOpen
                  ? "bg-white/[0.12] border-white/[0.25] text-white"
                  : "bg-zinc-900/90 hover:bg-zinc-800 border border-white/[0.08] hover:border-white/[0.18] text-zinc-400 hover:text-white"
              }`}
              title="Feature Hub & Menu"
            >
              <DotsThreeVerticalIcon size={14} />
            </button>

            {isMoreMenuOpen && (
              <div class="absolute right-0 top-full mt-1.5 w-60 glass-panel rounded-xl shadow-2xl border border-white/[0.12] py-1.5 z-50 animate-scale-in">
                <div class="px-3 py-1 border-b border-white/[0.06] flex items-center justify-between">
                  <span class="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                    Feature Hub
                  </span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400 font-mono">
                    All Tools
                  </span>
                </div>

                <div class="py-1 space-y-0.5 px-1 text-xs">
                  {/* Appearance & Accent Theme */}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    class="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition"
                  >
                    <div class="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <PaletteIcon size={12} />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-[11px] font-semibold">Appearance & Colors</span>
                      <span class="text-[9px] text-zinc-500 font-mono capitalize">Active: {accentColor}</span>
                    </div>
                  </button>

                  {/* Multi-Profile Identity Vault */}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setEditingProfile(null);
                      setIsCreatingNewProfile(false);
                      setIsProfileVaultModalOpen(true);
                    }}
                    class="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition"
                  >
                    <div class="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <IdentificationCardIcon size={12} />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-[11px] font-semibold">Identity Vault</span>
                      <span class="text-[9px] text-zinc-500">{profiles.length} Profiles Configured</span>
                    </div>
                  </button>

                  {/* Visual Execution Replay */}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleOpenLiveReplay();
                    }}
                    class="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition"
                  >
                    <div class="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <FilmReelIcon size={12} />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-[11px] font-semibold">Visual Execution Replay</span>
                      <span class="text-[9px] text-zinc-500">Step Timeline & DOM Inspector</span>
                    </div>
                  </button>

                  {/* Smart Notes & Raw Reminders */}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setActiveTab("NOTES");
                    }}
                    class="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition"
                  >
                    <div class="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <FileTextIcon size={12} />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-[11px] font-semibold">Smart Notes & Raw Reminders</span>
                      <span class="text-[9px] text-zinc-500">{savedNotes.length} Notes • AI Auto-Scheduler</span>
                    </div>
                  </button>

                  {/* Tasks & Schedules Manager */}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setActiveTab("PENDING");
                    }}
                    class="w-full px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:bg-white/[0.06] hover:text-white flex items-center gap-2 transition"
                  >
                    <div class="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <ListChecksIcon size={12} />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-[11px] font-semibold">Tasks & Recurring Schedules</span>
                      <span class="text-[9px] text-zinc-500">{activePendingCount} Pending / Active</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modern Segmented Tab Navigation (3 Tabs) */}
      <nav class="relative z-10 grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/[0.08] mb-3.5 backdrop-blur-md">
        <button
          onClick={() => setActiveTab("EXECUTE")}
          class={`relative py-1.5 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${
            activeTab === "EXECUTE"
              ? currentAccentStyles.tabActive
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <LightningIcon size={14} class={activeTab === "EXECUTE" ? currentAccentStyles.iconText : "text-zinc-400"} />
          <span>Execute</span>
        </button>

        <button
          onClick={() => setActiveTab("NOTES")}
          class={`relative py-1.5 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${
            activeTab === "NOTES"
              ? currentAccentStyles.tabActive
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <FileTextIcon size={14} class={activeTab === "NOTES" ? currentAccentStyles.iconText : "text-zinc-400"} />
          <span>Notes</span>
          {savedNotes.some((n) => n.status === "NEEDS_CLARIFICATION") && (
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("PENDING")}
          class={`relative py-1.5 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${
            activeTab === "PENDING"
              ? currentAccentStyles.tabActive
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <ListChecksIcon size={14} class={activeTab === "PENDING" ? currentAccentStyles.iconText : "text-zinc-400"} />
          <span>Schedules</span>
          {activePendingCount > 0 && (
            <span class={`ml-0.5 px-1.5 py-0.2 rounded-full border text-[9px] font-mono ${currentAccentStyles.badge}`}>
              {activePendingCount}
            </span>
          )}
        </button>
      </nav>

      {/* EXECUTE TAB VIEW */}
      {activeTab === "EXECUTE" && (
        <div class="relative z-10 flex-1 flex flex-col space-y-3 min-h-0 animate-fade-in">
          {/* Goal Input Glass Card */}
          <div class="glass-panel rounded-xl p-3.5 space-y-2.5 shadow-glass">
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <SparkleIcon size={13} class="accent-text" />
                <span>What should the agent do?</span>
              </label>
              {(() => {
                const currentActiveProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
                const currentProfileStyles = getProfileColorStyles(currentActiveProfile?.color);
                return (
                  <button
                    onClick={() => {
                      if (currentActiveProfile) {
                        handleOpenEditProfile(currentActiveProfile);
                      } else {
                        setIsProfileVaultModalOpen(true);
                      }
                    }}
                    class={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition active:scale-95 hover:brightness-110 ${
                      currentProfileStyles.badge
                    }`}
                    title="Edit Personal Preferences & Profile Settings"
                  >
                    {renderProfileIcon(currentActiveProfile?.icon, 10)}
                    <span class="truncate max-w-[90px]">{currentActiveProfile?.label || "Personal"}</span>
                  </button>
                );
              })()}
            </div>


            <textarea
              rows={3}
              placeholder="e.g., Go to CESC bill portal, fill account 102938492, verify amount, and prepare payment..."
              value={goal}
              onInput={(e) => setGoal((e.target as HTMLTextAreaElement).value)}
              class="w-full glass-input rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-[var(--accent-border)] resize-none leading-relaxed"
            />

            {/* Quick Suggestion Pills */}
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              {[
                "Autofill contact & feedback form",
                "Pay electricity bill on CESC",
                "Verify shopping cart & coupon",
                "Check broadband statement"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setGoal(suggestion)}
                  class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:accent-text border border-white/[0.05] transition truncate max-w-full"
                >
                  + {suggestion}
                </button>
              ))}
            </div>

            {/* Quick Billing Timeline Chips */}
            <div class="flex flex-wrap items-center gap-1.5 pt-1 pb-0.5">
              <span class="text-[10px] text-zinc-500 font-medium">Timeline:</span>
              {[
                { id: "MONTHLY", label: "Monthly Bill" },
                { id: "QUARTERLY", label: "Quarterly Bill" },
                { id: "YEARLY", label: "Yearly Bill" },
                { id: "ADVANCE", label: "Advance Payment" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const current = goal.trim();
                    const cleanGoal = current.replace(/\s*\(?(monthly|quarterly|yearly|annual|advance)\s*(bill|timeline|payment)?\)?/gi, "").trim();
                    setGoal(cleanGoal ? `${cleanGoal} (${opt.label})` : `Pay electricity ${opt.label.toLowerCase()}`);
                  }}
                  class="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] transition active:scale-95"
                  title={`Set goal timeline to ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {taskState === "EXECUTING" || taskState === "PLANNING" ? (
              <div class="flex gap-2">
                <button
                  disabled
                  class="flex-1 shimmer-btn h-9 rounded-lg text-xs font-semibold text-white opacity-90 inline-flex items-center justify-center gap-2 shadow-glow-sm"
                >
                  <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Agent is executing...</span>
                </button>
                <button
                  onClick={handleStopTask}
                  title="Stop and terminate agent execution immediately"
                  class="px-4 h-9 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50 active:scale-[0.98] transition-all border border-rose-400/40"
                >
                  <div class="w-2.5 h-2.5 rounded-sm bg-white" />
                  <span>Stop</span>
                </button>
              </div>
            ) : (
              <div class="flex flex-wrap gap-2">
                <button
                  onClick={() => handleStartTask()}
                  disabled={!goal.trim() || (taskState !== null && taskState !== "COMPLETED" && taskState !== "FAILED" && taskState !== "CANCELLED")}
                  class="flex-1 min-w-[130px] shimmer-btn h-9 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-glow-sm active:scale-[0.98] transition-all"
                >
                  <PlayIcon size={13} class="text-white fill-current" />
                  <span>Execute Goal in Tab</span>
                </button>
                <button
                  onClick={handleSmartFormatAndSchedule}
                  disabled={!goal.trim() || isFormattingTask}
                  title="Format rough task with AI, detect missing details, and auto-schedule"
                  class="px-3 h-9 shimmer-btn text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition shadow-sm"
                >
                  {isFormattingTask ? (
                    <div class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <SparkleIcon size={13} class="text-amber-300" />
                  )}
                  <span>AI Format & Schedule</span>
                </button>
                <button
                  onClick={handleSaveCurrentGoalAsTask}
                  disabled={!goal.trim()}
                  title="Save current goal and profile into your Task List for future runs"
                  class="px-3 h-9 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 border border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition"
                >
                  <FloppyDiskIcon size={13} />
                  <span>Save Task</span>
                </button>
              </div>
            )}
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div class="glass-panel bg-emerald-950/40 border-emerald-500/40 rounded-xl p-3.5 shadow-glow-emerald animate-scale-in">
              <div class="flex items-start gap-2.5">
                <CheckCircleIcon size={20} class="text-emerald-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold text-emerald-300">{successMessage.title}</h3>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      class="text-zinc-400 hover:text-white p-0.5 transition"
                    >
                      <XIcon size={13} />
                    </button>
                  </div>
                  <p class="text-[11px] text-emerald-100/90 mt-1 leading-relaxed">{successMessage.summary}</p>
                  <div class="mt-2.5 flex gap-2">
                    <button
                      onClick={() => {
                        setSuccessMessage(null);
                        setGoal("");
                        setLogs([]);
                        setTaskState(null);
                      }}
                      class="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-md transition"
                    >
                      New Goal
                    </button>
                    <button
                      onClick={() => {
                        setSuccessMessage(null);
                        setActiveTab("PENDING");
                      }}
                      class="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-md border border-white/[0.08] transition"
                    >
                      View Tasks & Schedules
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Challenge / Human Takeover Alert */}
          {securityChallenge && (
            <div class="glass-panel bg-amber-950/40 border-amber-500/50 rounded-xl p-3.5 shadow-lg shadow-amber-950/40 animate-scale-in">
              <div class="flex items-start gap-2.5">
                <WarningCircleIcon size={20} class="text-amber-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <h3 class="text-xs font-bold text-amber-300">Human Verification Required</h3>
                  <p class="text-[11px] text-amber-100/90 mt-1 leading-relaxed">
                    {securityChallenge.description || "Please solve the security challenge (CAPTCHA / 2FA) in the browser tab."}
                  </p>
                  <div class="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={handleResumeAfterChallenge}
                      class="text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1 rounded-md transition inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <CheckCircleIcon size={12} />
                      <span>I Solved It, Continue</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sensitive Action User Approval Card */}
          {/* Sensitive Action User Approval Card */}
          {approvalPrompt && (
            <div class="glass-panel accent-bg-subtle border-[var(--accent-border)] rounded-xl p-3.5 shadow-glass animate-scale-in">
              <div class="flex items-start gap-2.5">
                <ShieldCheckIcon size={20} class="accent-text shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <h3 class="text-xs font-bold text-zinc-100">Confirmation Required</h3>
                  <p class="text-xs text-zinc-200 mt-1 font-medium leading-relaxed">{approvalPrompt.summary}</p>
                  <p class="text-[11px] text-zinc-400 mt-0.5">{approvalPrompt.consequences}</p>
                  <div class="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleDecision(true)}
                      class="text-[11px] accent-btn-primary font-semibold px-3 py-1 rounded-md transition shadow-sm active:scale-95"
                    >
                      Approve & Continue
                    </button>
                    <button
                      onClick={() => handleDecision(false)}
                      class="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded-md border border-white/[0.08] transition active:scale-95"
                    >
                      Cancel Action
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Terminal & Logs Card */}
          <div class="glass-panel rounded-xl flex-1 flex flex-col min-h-[180px] overflow-hidden shadow-glass">
            <div class="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-zinc-950/80">
              <div class="flex items-center gap-2 text-zinc-400 text-[11px] font-semibold">
                <div class="flex gap-1">
                  <div class="w-2 h-2 rounded-full bg-rose-500/60" />
                  <div class="w-2 h-2 rounded-full bg-amber-500/60" />
                  <div class="w-2 h-2 rounded-full bg-emerald-500/60" />
                </div>
                <span class="ml-1 text-zinc-300">Execution Logs</span>
              </div>
              <div class="flex items-center gap-1.5">
                {(taskState === "EXECUTING" || taskState === "PLANNING") && (
                  <button
                    onClick={handleStopTask}
                    class="text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition shadow-sm active:scale-95 font-semibold"
                    title="Stop Agent Execution"
                  >
                    <div class="w-1.5 h-1.5 rounded-xs bg-rose-400" />
                    <span>Stop</span>
                  </button>
                )}
                {liveExecutionStepsRef.current.length > 0 && (
                  <button
                    onClick={handleOpenLiveReplay}
                    class="text-[10px] accent-badge-subtle hover:brightness-110 px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition shadow-sm active:scale-95"
                    title="Open Step-by-Step Visual Replay & Inspector"
                  >
                    <FilmReelIcon size={11} class="accent-text" />
                    <span>Replay Steps ({liveExecutionStepsRef.current.length})</span>
                  </button>
                )}
                {logs.length > 0 && (
                  <button
                    onClick={() => setLogs([])}
                    class="text-[10px] text-zinc-400 hover:text-zinc-200 transition px-1.5 py-0.5 rounded hover:bg-white/[0.05]"
                  >
                    Clear
                  </button>
                )}
                <span class="text-[10px] text-zinc-400 font-mono">
                  {logs.length} events
                </span>
              </div>
            </div>

            <div
              ref={logContainerRef}
              class="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-zinc-950/90 text-zinc-300 select-text leading-relaxed"
            >
              {logs.length === 0 ? (
                <div class="h-full flex flex-col items-center justify-center text-zinc-400 text-center py-6 space-y-1">
                  <SparkleIcon size={18} class="text-zinc-400" />
                  <p class="text-xs">Agent is idle and ready.</p>
                  <p class="text-[10px]">Enter a prompt above and click Execute Goal.</p>
                </div>
              ) : (
                logs.map((log, index) => {
                  const isError = log.toLowerCase().includes("error") || log.toLowerCase().includes("failed");
                  const isSuccess = log.toLowerCase().includes("completed") || log.toLowerCase().includes("success");
                  const isAction = log.toLowerCase().includes("executing:") || log.toLowerCase().includes("action");
                  const isVerification = log.toLowerCase().includes("verification") || log.toLowerCase().includes("challenge");

                  return (
                    <div
                      key={index}
                      class={`flex items-start gap-2 py-0.5 transition ${
                        isError
                          ? "text-rose-400 bg-rose-950/20 px-1.5 rounded border border-rose-900/30"
                          : isSuccess
                          ? "text-emerald-400 bg-emerald-950/20 px-1.5 rounded border border-emerald-900/30"
                          : isVerification
                          ? "text-amber-300 bg-amber-950/20 px-1.5 rounded border border-amber-900/30"
                          : isAction
                          ? "accent-text"
                          : "text-zinc-300"
                      }`}
                    >
                      <span class="text-zinc-400 select-none text-[10px] shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span class="break-all whitespace-pre-wrap flex-1">{log}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SMART NOTES & RAW REMINDERS TAB VIEW */}
      {activeTab === "NOTES" && (
        <div class="relative z-10 flex-1 flex flex-col space-y-3 min-h-0 animate-fade-in overflow-y-auto custom-scrollbar pr-1 pb-4">
          {/* Note Input & AI Auto-Structuring Card */}
          <div class="glass-panel rounded-xl p-3.5 space-y-3 shadow-glass shrink-0">
            <div class="flex items-start justify-between gap-2.5 border-b border-white/[0.06] pb-2.5">
              <div class="flex items-start gap-2.5 min-w-0 flex-1">
                <div
                  class="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 mt-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${currentThemeStyles.gradientFrom}, ${currentThemeStyles.gradientTo})`
                  }}
                >
                  <FileTextIcon size={13} />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-xs font-bold text-zinc-100 flex items-center gap-1.5 truncate">
                    <span>{activeNoteId ? "Editing Note" : "Smart Notes & Raw Tasks"}</span>
                    {activeNoteId && (
                      <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono shrink-0">
                        Active
                      </span>
                    )}
                  </h3>
                  <p class="text-[10px] text-zinc-400 leading-tight mt-0.5">
                    {activeNoteId
                      ? "Modify your note or schedule below and click Save & Run"
                      : "Jot down raw thoughts or messy bills — AI parses, clarifies, and schedules"}
                  </p>
                </div>
              </div>

              {activeNoteId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveNoteId(null);
                    setActiveNoteDraft(null);
                    setNoteInput("");
                    setCustomPortalUrl("");
                  }}
                  class="shrink-0 whitespace-nowrap text-[10px] font-medium px-2 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 hover:text-white border border-white/[0.1] transition flex items-center gap-1 active:scale-95 shadow-sm"
                  title="Start a fresh note"
                >
                  <PlusIcon size={11} />
                  <span>New Note</span>
                </button>
              )}
            </div>

            {/* Quick Template Pills */}
            <div class="space-y-1.5">
              <span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Quick Raw Examples:
              </span>
              <div class="flex flex-wrap gap-1.5">
                {[
                  {
                    icon: LightningIcon,
                    label: "CESC Electricity (₹1,450 by 15th)",
                    text: "pay my cesc electric bill of 1450 before oct 15 every month on 5th"
                  },
                  {
                    icon: DeviceMobileIcon,
                    label: "Airtel Recharge (₹479 on 1st)",
                    text: "recharge my airtel mobile with 479 pack on 1st of every month"
                  },
                  {
                    icon: CreditCardIcon,
                    label: "HDFC Credit Card (₹8,500 by 20th)",
                    text: "pay hdfc credit card bill 8500 due on 20th every month"
                  },
                  {
                    icon: GlobeIcon,
                    label: "Broadband (₹999 on 10th)",
                    text: "pay wifi broadband bill of 999 before 10th monthly"
                  },
                  {
                    icon: ShoppingCartSimpleIcon,
                    label: "Amazon Price Drop (₹19,999 Target)",
                    text: "track Sony WH-1000XM4 on amazon.in, auto buy when price drops under 19999 (currently 24999)"
                  }
                ].map((sample, idx) => {
                  const IconComp = sample.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNoteInput(sample.text);
                        handleAnalyzeRawNote(sample.text, true);
                      }}
                      class="text-[10px] px-2 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.06] hover:border-white/[0.15] text-zinc-300 hover:text-white transition active:scale-95 flex items-center gap-1.5"
                    >
                      <IconComp size={11} class="text-zinc-400" />
                      <span>{sample.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Raw Text Input Area */}
            <div class="relative">
              <textarea
                id="smart-note-textarea"
                rows={3}
                value={noteInput}
                onInput={(e) => setNoteInput((e.target as HTMLTextAreaElement).value)}
                placeholder="Type anything raw... e.g. 'I have a 1450 electricity bill due on cesc.co.in by 15th oct, pay every month on 5th'"
                class="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/25 resize-none transition"
              />
            </div>

            {/* Target Web URL Input (Optional) */}
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/[0.08]">
              <GlobeIcon size={13} class="text-zinc-400 shrink-0" />
              <input
                type="url"
                value={customPortalUrl}
                onInput={(e) => setCustomPortalUrl((e.target as HTMLInputElement).value)}
                placeholder="Paste Target URL / Web Page (optional)..."
                class="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono"
              />
            </div>

            {/* ONLY 2 Action Buttons: Clear and Save & Run */}
            <div class="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setNoteInput("");
                  setCustomPortalUrl("");
                  setActiveNoteDraft(null);
                  setActiveNoteId(null);
                  setAttachedTabNotice(null);
                }}
                disabled={!noteInput.trim() && !customPortalUrl.trim()}
                class={`px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.06] transition active:scale-95 ${
                  !noteInput.trim() && !customPortalUrl.trim() ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Clear
              </button>

              <button
                type="button"
                disabled={(!noteInput.trim() && !customPortalUrl.trim()) || isNoteAnalyzing}
                onClick={() => handleSaveAndRunCustomUrlNote()}
                class={`px-4 py-1.5 rounded-lg text-xs font-semibold shimmer-btn text-white transition shadow-md flex items-center gap-1.5 active:scale-95 ${
                  (!noteInput.trim() && !customPortalUrl.trim()) || isNoteAnalyzing
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                style={{
                  background: `linear-gradient(135deg, ${currentThemeStyles.gradientFrom}, ${currentThemeStyles.gradientTo})`
                }}
              >
                <PlayIcon size={13} class={isNoteAnalyzing ? "animate-spin" : ""} />
                <span>{isNoteAnalyzing ? "Running..." : "Save & Run"}</span>
              </button>
            </div>
          </div>

          {/* Real-Time AI Understanding & Clarification Card */}
          {activeNoteDraft && (
            <div class="glass-panel rounded-xl p-3.5 space-y-3 shadow-glass border border-white/[0.12] animate-slide-down shrink-0">
              {/* Status Header */}
              <div class="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div class="flex items-center gap-2">
                  <div
                    class={`w-2 h-2 rounded-full ${
                      activeNoteDraft.missingFields && activeNoteDraft.missingFields.length > 0
                        ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse"
                        : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                    }`}
                  />
                  <span class="text-xs font-bold text-zinc-100">
                    {activeNoteDraft.missingFields && activeNoteDraft.missingFields.length > 0
                      ? "Real-Time Clarification Needed"
                      : "Ready to Schedule"}
                  </span>
                </div>

                <span
                  class={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    activeNoteDraft.missingFields && activeNoteDraft.missingFields.length > 0
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {activeNoteDraft.missingFields && activeNoteDraft.missingFields.length > 0
                    ? `${activeNoteDraft.missingFields.length} Missing Field${
                        activeNoteDraft.missingFields.length > 1 ? "s" : ""
                      }`
                    : "Complete"}
                </span>
              </div>

              {/* Real-Time Interactive Clarification Form */}
              {activeNoteDraft.missingFields && activeNoteDraft.missingFields.length > 0 ? (
                <div class="p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 text-purple-200 space-y-2.5">
                  <div class="flex items-start gap-2">
                    <InfoIcon size={16} class="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 class="text-[11px] font-bold text-purple-300">Clarification Needed in Real-Time</h4>
                      <p class="text-[10px] text-purple-200/90 leading-relaxed">
                        {activeNoteDraft.clarificationPrompt ||
                          "I understood your task, but need a few missing details to complete the automated schedule:"}
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {activeNoteDraft.missingFields.includes("consumerNumber") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Consumer / Account # <span class="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={activeNoteDraft.consumerNumber || ""}
                          placeholder="e.g. 05001234567"
                          onInput={(e) =>
                            handleUpdateNoteDraftField(
                              "consumerNumber",
                              (e.target as HTMLInputElement).value
                            )
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/40 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition"
                        />
                      </div>
                    )}

                    {activeNoteDraft.missingFields.includes("providerName") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Provider / Biller <span class="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={activeNoteDraft.providerName || ""}
                          placeholder="e.g. CESC, WBSEDCL"
                          onInput={(e) =>
                            handleUpdateNoteDraftField(
                              "providerName",
                              (e.target as HTMLInputElement).value
                            )
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/40 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition"
                        />
                      </div>
                    )}

                    {activeNoteDraft.missingFields.includes("dueAmount") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Due Amount
                        </label>
                        <input
                          type="text"
                          value={activeNoteDraft.dueAmount || ""}
                          placeholder="e.g. ₹1,450"
                          onInput={(e) =>
                            handleUpdateNoteDraftField(
                              "dueAmount",
                              (e.target as HTMLInputElement).value
                            )
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/40 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition"
                        />
                      </div>
                    )}

                    {activeNoteDraft.missingFields.includes("dueDate") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={activeNoteDraft.dueDate || ""}
                          onInput={(e) =>
                            handleUpdateNoteDraftField(
                              "dueDate",
                              (e.target as HTMLInputElement).value
                            )
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/40 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition"
                        />
                      </div>
                    )}

                    {activeNoteDraft.missingFields.includes("targetUrl") && (
                      <div class="sm:col-span-2">
                        <div class="flex items-center justify-between mb-1">
                          <label class="text-[10px] font-semibold text-purple-200">
                            Target Portal URL
                          </label>
                          <button
                            type="button"
                            onClick={handleAutoDetectTabForNote}
                            class="text-[9px] text-purple-300 hover:text-white underline transition"
                          >
                            Grab from active tab
                          </button>
                        </div>
                        <input
                          type="url"
                          value={activeNoteDraft.targetUrl || ""}
                          placeholder="https://www.cesc.co.in"
                          onInput={(e) =>
                            handleUpdateNoteDraftField(
                              "targetUrl",
                              (e.target as HTMLInputElement).value
                            )
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/40 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 transition"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Structured Task Preview Fields */}
              <div class="space-y-2 pt-1">
                <div>
                  <label class="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Structured Task Title
                  </label>
                  <input
                    type="text"
                    value={activeNoteDraft.title}
                    onInput={(e) =>
                      handleUpdateNoteDraftField("title", (e.target as HTMLInputElement).value)
                    }
                    class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/20"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2 text-[11px]">
                  <div class="p-2 rounded-lg bg-zinc-900/60 border border-white/[0.06]">
                    <span class="text-[10px] text-zinc-400 block mb-0.5">Category & Cycle:</span>
                    <div class="flex items-center gap-1.5">
                      <span class="font-semibold text-zinc-200">{activeNoteDraft.category}</span>
                      <span class="text-zinc-500">•</span>
                      <span class="text-zinc-400 font-mono text-[10px]">
                        {activeNoteDraft.billingCycle}
                      </span>
                    </div>
                  </div>

                  <div class="p-2 rounded-lg bg-zinc-900/60 border border-white/[0.06]">
                    <span class="text-[10px] text-zinc-400 block mb-0.5">Schedule Trigger:</span>
                    <div class="flex items-center gap-1 text-zinc-200 font-medium">
                      <ClockIcon size={12} class="text-zinc-400" />
                      <span>
                        {activeNoteDraft.schedule?.frequency || "MONTHLY"} •{" "}
                        {activeNoteDraft.schedule?.time || "09:30"}
                        {activeNoteDraft.schedule?.dayOfMonth
                          ? ` (Day ${activeNoteDraft.schedule.dayOfMonth})`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Portal / Web URL (Always shown & editable) */}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Target Web URL / Portal
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoDetectTabForNote}
                      class="text-[9px] text-zinc-400 hover:text-white underline transition flex items-center gap-1"
                    >
                      <GlobeIcon size={10} />
                      <span>Grab from active tab</span>
                    </button>
                  </div>
                  <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.08] text-xs text-zinc-300">
                    <GlobeIcon size={13} class="text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      value={activeNoteDraft.targetUrl || ""}
                      placeholder="e.g. https://www.cesc.co.in or grab from tab"
                      onInput={(e) =>
                        handleUpdateNoteDraftField("targetUrl", (e.target as HTMLInputElement).value)
                      }
                      class="w-full bg-transparent text-xs text-white focus:outline-none placeholder-zinc-500"
                    />
                  </div>
                </div>

                {/* Commerce Price Watch Condition Controls */}
                {(activeNoteDraft.category === "COMMERCE_WATCH" || activeNoteDraft.priceCondition) && (
                  <div class="p-3 rounded-xl border border-white/[0.12] bg-zinc-900/40 text-zinc-200 space-y-2.5 animate-slide-down">
                    <div class="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                      <div class="flex items-center gap-1.5 font-bold text-xs text-zinc-100">
                        <ShoppingCartSimpleIcon size={14} class={currentAccentStyles.iconText || "accent-text"} />
                        <span>Price Drop & Auto-Checkout Engine</span>
                      </div>
                      <span class={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${currentAccentStyles.badge}`}>
                        Auto-Trigger
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="block text-[10px] font-semibold text-zinc-300 mb-1">
                          Target Alert Price (₹) <span class={currentAccentStyles.textHighlight || "accent-text"}>*</span>
                        </label>
                        <div class="relative">
                          <span class={`absolute left-2.5 top-1.5 text-xs font-mono font-bold ${currentAccentStyles.textHighlight || "accent-text"}`}>₹</span>
                          <input
                            type="number"
                            value={activeNoteDraft.priceCondition?.targetPrice || ""}
                            placeholder="e.g. 19999"
                            onInput={(e) => {
                              const val = parseFloat((e.target as HTMLInputElement).value);
                              const updatedCond = {
                                ...(activeNoteDraft.priceCondition || {
                                  currency: "INR",
                                  checkIntervalMinutes: 30,
                                  autoAddToCart: true,
                                  autoProceedToCheckout: true,
                                  priceMatched: false
                                }),
                                targetPrice: isNaN(val) ? undefined : val
                              };
                              handleUpdateNoteDraftField("priceCondition", updatedCond);
                              if (!isNaN(val)) {
                                handleUpdateNoteDraftField("dueAmount", `₹${val.toLocaleString("en-IN")}`);
                              }
                            }}
                            class="w-full pl-6 pr-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.12] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-color)] font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label class="block text-[10px] font-semibold text-zinc-400 mb-1">
                          Current Price (₹)
                        </label>
                        <div class="relative">
                          <span class="absolute left-2.5 top-1.5 text-xs text-zinc-500 font-mono">₹</span>
                          <input
                            type="number"
                            value={activeNoteDraft.priceCondition?.currentPrice || ""}
                            placeholder="e.g. 24999"
                            onInput={(e) => {
                              const val = parseFloat((e.target as HTMLInputElement).value);
                              const updatedCond = {
                                ...(activeNoteDraft.priceCondition || {
                                  currency: "INR",
                                  checkIntervalMinutes: 30,
                                  autoAddToCart: true,
                                  autoProceedToCheckout: true,
                                  priceMatched: false
                                }),
                                currentPrice: isNaN(val) ? undefined : val
                              };
                              handleUpdateNoteDraftField("priceCondition", updatedCond);
                            }}
                            class="w-full pl-6 pr-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-color)] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Commerce Automation Toggles */}
                    <div class="space-y-1.5 pt-1 border-t border-white/[0.06]">
                      <label class="flex items-center justify-between text-[11px] text-zinc-200 cursor-pointer">
                        <span class="flex items-center gap-1.5">
                          <CheckCircleIcon size={12} class={currentAccentStyles.iconText || "accent-text"} />
                          <span>Auto-add product to cart when target reached</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={activeNoteDraft.priceCondition?.autoAddToCart !== false}
                          onChange={(e) => {
                            const updatedCond = {
                              ...(activeNoteDraft.priceCondition || {
                                currency: "INR",
                                checkIntervalMinutes: 30,
                                autoAddToCart: true,
                                autoProceedToCheckout: true,
                                priceMatched: false
                              }),
                              autoAddToCart: (e.target as HTMLInputElement).checked
                            };
                            handleUpdateNoteDraftField("priceCondition", updatedCond);
                          }}
                          class="rounded bg-zinc-900 border-zinc-700 focus:ring-[var(--accent-color)] cursor-pointer"
                        />
                      </label>

                      <label class="flex items-center justify-between text-[11px] text-zinc-200 cursor-pointer">
                        <span class="flex items-center gap-1.5">
                          <ShieldCheckIcon size={12} class="text-amber-400" />
                          <span>Proceed to checkout & pause for 1-click confirmation</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={activeNoteDraft.priceCondition?.autoProceedToCheckout !== false}
                          onChange={(e) => {
                            const updatedCond = {
                              ...(activeNoteDraft.priceCondition || {
                                currency: "INR",
                                checkIntervalMinutes: 30,
                                autoAddToCart: true,
                                autoProceedToCheckout: true,
                                priceMatched: false
                              }),
                              autoProceedToCheckout: (e.target as HTMLInputElement).checked
                            };
                            handleUpdateNoteDraftField("priceCondition", updatedCond);
                          }}
                          class="rounded bg-zinc-900 border-zinc-700 focus:ring-[var(--accent-color)] cursor-pointer"
                        />
                      </label>
                    </div>

                    <div class="text-[10px] text-zinc-400 bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] leading-relaxed">
                      Agent monitors product price in background. When target is reached, it adds item to cart and brings you directly to the 1-click payment screen.
                    </div>
                  </div>
                )}

                {/* Formatted Goal */}
                <div>
                  <label class="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Structured Execution Goal
                  </label>
                  <p class="text-[11px] text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-white/[0.06] leading-relaxed">
                    {activeNoteDraft.formattedGoal}
                  </p>
                </div>

                {/* Safety Shield Guard Banner */}
                {activeNoteDraft.requiresHumanApproval && (
                  <div class="p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-200 flex items-start gap-2">
                    <ShieldCheckIcon size={16} class="text-amber-400 shrink-0 mt-0.5" />
                    <p class="text-[10px] text-amber-200/90 leading-relaxed">
                      {activeNoteDraft.safetySummary ||
                        "Sensitive financial transactions will pause and request your approval before charging."}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleScheduleNoteToTasks(false)}
                    class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800/90 hover:bg-zinc-700 border border-white/[0.12] text-zinc-200 hover:text-white transition shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <FloppyDiskIcon size={13} />
                    <span>Add to Tasks & Schedules</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScheduleNoteToTasks(true)}
                    class="px-3.5 py-1.5 rounded-lg text-xs font-semibold shimmer-btn text-white transition shadow-md active:scale-95 flex items-center gap-1.5"
                    style={{
                      background: `linear-gradient(135deg, ${currentThemeStyles.gradientFrom}, ${currentThemeStyles.gradientTo})`
                    }}
                  >
                    <PlayIcon size={13} />
                    <span>Save & Run Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Notes History & Notebook */}
          <div class="glass-panel rounded-xl p-3.5 space-y-2.5 shadow-glass shrink-0 min-h-[140px] flex flex-col mb-4">
            <div class="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div class="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <FileTextIcon size={13} class="text-zinc-400" />
                <span>Notes & Raw Memos History</span>
              </div>
              <span class="text-[10px] text-zinc-500 font-mono">
                {savedNotes.length} Note{savedNotes.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div class="space-y-2 overflow-y-auto custom-scrollbar flex-1 max-h-[300px] pr-1">
              {savedNotes.length === 0 ? (
                <div class="py-8 text-center text-zinc-500 space-y-1">
                  <FileTextIcon size={24} class="mx-auto opacity-40 mb-1" />
                  <p class="text-xs">No notes jotted down yet.</p>
                  <p class="text-[10px]">Type any raw task above to parse and schedule automatically.</p>
                </div>
              ) : (
                savedNotes.map((note) => {
                  const isSelected = activeNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      class={`p-3 rounded-xl border transition cursor-pointer flex flex-col space-y-2 ${
                        isSelected
                          ? "bg-white/[0.08] border-white/[0.25] shadow-glow-sm"
                          : "bg-zinc-900/60 border-white/[0.06] hover:bg-zinc-900/90 hover:border-white/[0.15]"
                      }`}
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 space-y-1 min-w-0">
                          <p class="text-xs text-zinc-200 line-clamp-2 leading-relaxed font-medium">
                            "{note.rawText}"
                          </p>
                          {note.parsedDraft?.targetUrl && (
                            <div class="flex items-center gap-1 text-[10px] text-emerald-400 font-mono truncate">
                              <GlobeIcon size={11} class="shrink-0 text-emerald-400" />
                              <span class="truncate">{note.parsedDraft.targetUrl}</span>
                            </div>
                          )}
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectNote(note);
                            }}
                            class="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-white/[0.05] transition flex items-center gap-1 text-[10px]"
                            title="Edit this note"
                          >
                            <PencilSimpleIcon size={11} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            class="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-white/[0.05] transition"
                            title="Delete note"
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      </div>

                      <div class="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px]">
                        <span class="text-zinc-500 font-mono">
                          {new Date(note.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>

                        <div class="flex items-center gap-1.5">
                          {note.status === "SCHEDULED" ? (
                            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                              <CheckCircleIcon size={10} />
                              <span>Scheduled</span>
                            </span>
                          ) : note.status === "NEEDS_CLARIFICATION" ? (
                            <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                              <InfoIcon size={10} />
                              <span>Clarify Details</span>
                            </span>
                          ) : (
                            <span class="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.06]">
                              Draft
                            </span>
                          )}

                          {note.status === "SCHEDULED" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab("PENDING");
                              }}
                              class="text-[9px] text-zinc-400 hover:text-white underline transition ml-1"
                            >
                              View in Schedules
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PENDING TASKS & SCHEDULER TAB VIEW */}
      {activeTab === "PENDING" && (
        <div class="relative z-10 flex-1 flex flex-col space-y-3 min-h-0 animate-fade-in">
          {/* Smart Metrics Bar */}
          <div class="grid grid-cols-3 gap-2">
            <div class="glass-card rounded-xl p-2.5 flex flex-col justify-between shadow-subtle">
              <span class="text-[10px] text-zinc-400 font-medium">Active Tasks</span>
              <span class="text-base font-bold text-zinc-100 font-mono mt-0.5">{activePendingCount}</span>
            </div>
            <div class="glass-card rounded-xl p-2.5 flex flex-col justify-between shadow-subtle">
              <span class="text-[10px] accent-text font-medium">Scheduled</span>
              <span class="text-base font-bold accent-text font-mono mt-0.5">{activeScheduledCount}</span>
            </div>
            <div class="glass-card rounded-xl p-2.5 flex flex-col justify-between shadow-subtle">
              <span class="text-[10px] text-amber-400 font-medium">Due Soon</span>
              <span class="text-base font-bold text-amber-300 font-mono mt-0.5">{dueSoonCount}</span>
            </div>
          </div>

          {/* Creation Section Toggle Button */}
          <div class="glass-panel rounded-xl overflow-hidden shadow-glass">
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              class="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/[0.03] transition"
            >
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-md accent-badge-subtle flex items-center justify-center">
                  <PlusIcon size={12} />
                </div>
                <span>Create New Task or Recurring Schedule</span>
              </div>
              {isCreateOpen ? <CaretUpIcon size={13} /> : <CaretDownIcon size={13} />}
            </button>

            {/* Creation Form Accordion Content */}
            {isCreateOpen && (
              <div class="p-3.5 pt-1 border-t border-white/[0.06] space-y-3 text-xs animate-slide-down max-h-[calc(100vh-210px)] overflow-y-auto overscroll-contain pr-1.5">
                {/* Drag & Drop / Paste / Upload Bill Document Scanner Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingBill(true);
                  }}
                  onDragLeave={() => setIsDraggingBill(false)}
                  onDrop={handleBillDrop}
                  class={`relative rounded-xl p-3 border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
                    isDraggingBill
                      ? "border-[var(--accent-color)] bg-[var(--accent-bg-subtle)] scale-[1.01]"
                      : isExtractingBill
                      ? "border-[var(--accent-border)] bg-zinc-900/80 animate-pulse"
                      : "border-white/[0.12] hover:border-[var(--accent-border)] bg-zinc-900/40 hover:bg-zinc-900/70"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={handleBillFileUpload}
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    disabled={isExtractingBill}
                  />

                  {isExtractingBill ? (
                    <div class="flex items-center gap-2 py-1">
                      <div class="w-4 h-4 border-2 border-white/30 border-t-[var(--accent-color)] rounded-full animate-spin shrink-0" />
                      <span class="text-xs font-semibold accent-text">
                        Extracting Biller, Account No, Due Date & Amount...
                      </span>
                    </div>
                  ) : (
                    <div class="flex items-center gap-2.5 py-0.5">
                      <div class="w-7 h-7 rounded-lg accent-badge-subtle flex items-center justify-center shrink-0">
                        <UploadSimpleIcon size={14} class="accent-text" />
                      </div>
                      <div class="text-left min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-semibold text-zinc-100">
                            Drop, Paste, or Upload Bill / Invoice / Slip
                          </span>
                          <span class="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.08] text-zinc-400 font-mono">
                            PDF / PNG / JPG
                          </span>
                        </div>
                        <p class="text-[10px] text-zinc-400">
                          Auto-extracts Biller Name, Consumer A/C No, Due Date, and Amount
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bill Extraction Success / Error Feedback */}
                {extractSuccess && (
                  <div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col gap-2.5 animate-fade-in text-[11px] shadow-glow-emerald">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-1.5 text-emerald-300 font-semibold">
                        <CheckCircleIcon size={14} class="text-emerald-400 shrink-0" />
                        <span>{extractSuccess}</span>
                      </div>
                      <button
                        onClick={() => setExtractSuccess(null)}
                        class="text-zinc-400 hover:text-white p-0.5"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/20">
                      <button
                        onClick={() => {
                          const goalPrompt = `Pay ${billerType.toLowerCase()} ${billerBillingCycle.toLowerCase()} bill for ${billerProvider || newTaskTitle}. Details: First Name: ${billerFirstName} | Last Name: ${billerLastName} | Account/Consumer ID: ${billerConsumerNo} | Bill Amount: ${billerAmount} | Billing Timeline: ${billerBillingCycle} Bill. Select the payment link matching this billing cycle (${billerBillingCycle}). Stop and request user confirmation before final payment/card submission.`;
                          setActiveTab("EXECUTE");
                          setGoal(goalPrompt);
                          handleStartTask(goalPrompt, billerPortalUrl || undefined);
                        }}
                        class="shimmer-btn text-white text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <PlayIcon size={11} class="fill-current" />
                        <span>Run Task Now</span>
                      </button>
                      <button
                        onClick={() => handleCreatePendingTask()}
                        class="bg-emerald-800/80 hover:bg-emerald-700 active:bg-emerald-800 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-400/30 inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                      >
                        <FloppyDiskIcon size={12} />
                        <span>Save to Task List</span>
                      </button>
                    </div>
                  </div>
                )}

                {extractError && (
                  <div class="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center justify-between animate-fade-in text-[10px]">
                    <div class="flex items-center gap-1.5 text-rose-300 font-medium">
                      <WarningCircleIcon size={12} class="text-rose-400 shrink-0" />
                      <span>{extractError}</span>
                    </div>
                    <button
                      onClick={() => setExtractError(null)}
                      class="text-zinc-400 hover:text-white p-0.5"
                    >
                      <XIcon size={11} />
                    </button>
                  </div>
                )}

                {/* Title & Priority Row */}
                <div class="space-y-1">
                  <label class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Task Title <span class="text-rose-400">*</span>
                  </label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Pay Monthly Electricity Bill, Submit Contact Form"
                      value={newTaskTitle}
                      onInput={(e) => setNewTaskTitle((e.target as HTMLInputElement).value)}
                      class="flex-1 glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-100 placeholder-zinc-500"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority((e.target as HTMLSelectElement).value as TaskPriority)}
                      class="glass-input rounded-lg px-2 h-8 text-[11px] text-zinc-200 font-medium shrink-0"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>

                {/* Due Date & Action Buttons Drawer Controls */}
                <div class="grid grid-cols-3 gap-2 items-center">
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-zinc-400 block font-medium">Due Date</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onInput={(e) => setNewTaskDueDate((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-zinc-400 block font-medium">Recurrence</label>
                    <button
                      type="button"
                      onClick={() => setShowScheduleDetails(!showScheduleDetails)}
                      class={`w-full h-8 text-xs px-2 rounded-lg border inline-flex items-center justify-center gap-1.5 transition ${
                        showScheduleDetails || scheduleEnabled
                          ? "accent-badge-subtle shadow-glow-sm"
                          : "glass-input text-zinc-300 hover:text-white"
                      }`}
                    >
                      <RepeatIcon size={12} class="shrink-0" />
                      <span class="truncate">{scheduleEnabled ? "Configured" : "+ Schedule"}</span>
                    </button>
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-zinc-400 block font-medium">Profile Info</label>
                    <button
                      type="button"
                      onClick={() => setShowBillerDetails(!showBillerDetails)}
                      class={`w-full h-8 text-xs px-2 rounded-lg border inline-flex items-center justify-center gap-1.5 transition ${
                        showBillerDetails
                          ? "accent-badge-subtle shadow-glow-sm"
                          : "glass-input text-zinc-300 hover:text-white"
                      }`}
                    >
                      <UserIcon size={12} class="shrink-0" />
                      <span class="truncate">+ Profile</span>
                    </button>
                  </div>
                </div>

                {/* Schedule Drawer */}
                {showScheduleDetails && (
                  <div class="glass-panel rounded-xl p-3 space-y-2.5 border-[var(--accent-border)] animate-fade-in">
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                      <div class="flex items-center gap-1.5 accent-text font-semibold text-[11px]">
                        <CalendarIcon size={13} />
                        <span>Recurring Automation & Alarms</span>
                      </div>
                      <label class="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scheduleEnabled}
                          onChange={(e) => setScheduleEnabled((e.target as HTMLInputElement).checked)}
                          class="rounded bg-zinc-900 border-zinc-700 accent-[var(--accent-color)] focus:ring-0 cursor-pointer"
                        />
                        <span>Enable Schedule</span>
                      </label>
                    </div>

                    {scheduleEnabled && (
                      <>
                        <div class="grid grid-cols-2 gap-2">
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Frequency</label>
                            <select
                              value={scheduleFreq}
                              onChange={(e) => setScheduleFreq((e.target as HTMLSelectElement).value as ScheduleFrequency)}
                              class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                            >
                              <option value="ONCE">One-Time Run</option>
                              <option value="DAILY">Daily</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="CUSTOM_DAYS">Custom Interval</option>
                            </select>
                          </div>
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Trigger Time</label>
                            <input
                              type="time"
                              value={scheduleTime}
                              onInput={(e) => setScheduleTime((e.target as HTMLInputElement).value)}
                              class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                            />
                          </div>
                        </div>

                        {scheduleFreq === "MONTHLY" && (
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Day of Month (1 - 31)</label>
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={scheduleDayOfMonth}
                              onInput={(e) => setScheduleDayOfMonth(Number((e.target as HTMLInputElement).value))}
                              class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                            />
                          </div>
                        )}

                        {scheduleFreq === "WEEKLY" && (
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Day of Week</label>
                            <select
                              value={scheduleDayOfWeek}
                              onChange={(e) => setScheduleDayOfWeek(Number((e.target as HTMLSelectElement).value))}
                              class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                            >
                              <option value={1}>Monday</option>
                              <option value={2}>Tuesday</option>
                              <option value={3}>Wednesday</option>
                              <option value={4}>Thursday</option>
                              <option value={5}>Friday</option>
                              <option value={6}>Saturday</option>
                              <option value={0}>Sunday</option>
                            </select>
                          </div>
                        )}

                        {scheduleFreq === "CUSTOM_DAYS" && (
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Repeat Every N Days</label>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={scheduleIntervalDays}
                              onInput={(e) => setScheduleIntervalDays(Number((e.target as HTMLInputElement).value))}
                              class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                            />
                          </div>
                        )}

                        <div class="bg-[var(--accent-bg-subtle)] p-2 rounded-lg border border-[var(--accent-border)] flex items-center justify-between">
                          <div class="flex flex-col">
                            <span class="text-[11px] font-semibold accent-text">Auto-Execute with Agent</span>
                            <span class="text-[10px] text-zinc-400">Launch autonomous browser run at scheduled time</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={scheduleAutoExecute}
                            onChange={(e) => setScheduleAutoExecute((e.target as HTMLInputElement).checked)}
                            class="rounded bg-zinc-900 border-zinc-700 accent-[var(--accent-color)] focus:ring-0 cursor-pointer"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Profile Details Drawer */}
                {showBillerDetails && (
                  <div class="glass-panel rounded-xl p-3 space-y-2.5 border-[var(--accent-border)] animate-fade-in">
                    <div class="text-[11px] font-semibold accent-text flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                      <div class="flex items-center gap-1.5">
                        <UserIcon size={13} />
                        <span>User Profile & Autofill Credentials</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile(null);
                          setIsCreatingNewProfile(false);
                          setIsProfileVaultModalOpen(true);
                        }}
                        class="text-[10px] accent-text hover:brightness-125 font-medium inline-flex items-center gap-1"
                      >
                        <IdentificationCardIcon size={11} />
                        <span>Manage Vault</span>
                      </button>
                    </div>

                    {/* Identity Preset Selector */}
                    {profiles.length > 0 && (
                      <div class="bg-white/[0.03] p-2 rounded-lg border border-[var(--accent-border)]">
                        <label class="text-[10px] accent-text block mb-1 font-semibold flex items-center gap-1">
                          <SparkleIcon size={11} />
                          <span>Autofill from Identity Vault Preset</span>
                        </label>
                        <select
                          value={newTaskProfileId}
                          onChange={(e) => handleApplyProfileToCreateForm((e.target as HTMLSelectElement).value)}
                          class="w-full glass-input rounded-lg px-2 h-7 text-xs text-zinc-200 font-medium"
                        >
                          <option value="">-- Select Identity Profile --</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} {p.isDefault ? "★ (Default)" : ""} - {[p.firstName, p.lastName].filter(Boolean).join(" ") || p.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}


                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Category</label>
                        <select
                          value={billerType}
                          onChange={(e) => setBillerType((e.target as HTMLSelectElement).value as TaskCategory)}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        >
                          <option value="GENERAL">General Web</option>
                          <option value="FORM_FILL">Form Autofill</option>
                          <option value="ELECTRICITY">Electricity</option>
                          <option value="WATER">Water</option>
                          <option value="GAS">Gas</option>
                          <option value="INTERNET">Internet</option>
                          <option value="MOBILE">Mobile</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                          <option value="SHOPPING">Shopping</option>
                          <option value="COMMERCE_WATCH">Commerce Price Watch</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Billing Timeline</label>
                        <select
                          value={billerBillingCycle}
                          onChange={(e) => setBillerBillingCycle((e.target as HTMLSelectElement).value as BillingCycle)}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        >
                          <option value="MONTHLY">Monthly Bill</option>
                          <option value="QUARTERLY">Quarterly Bill</option>
                          <option value="YEARLY">Yearly / Annual Bill</option>
                          <option value="ADVANCE">Advance Payment</option>
                          <option value="ONE_TIME">One-Time Payment</option>
                          <option value="CUSTOM">Custom Timeline</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label class="text-[10px] text-zinc-400 block mb-1">Site / Provider</label>
                      <input
                        type="text"
                        placeholder="e.g. Google Demo, CESC"
                        value={billerProvider}
                        onInput={(e) => setBillerProvider((e.target as HTMLInputElement).value)}
                        class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                      />
                    </div>

                    <div>
                      <label class="text-[10px] text-zinc-400 block mb-1">Target Webpage / Form URL</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={billerPortalUrl}
                        onInput={(e) => setBillerPortalUrl((e.target as HTMLInputElement).value)}
                        class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                      />
                    </div>

                    {/* Separate First Name & Last Name */}
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">First Name</label>
                        <input
                          type="text"
                          placeholder="e.g. John"
                          value={billerFirstName}
                          onInput={(e) => setBillerFirstName((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Last Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Doe"
                          value={billerLastName}
                          onInput={(e) => setBillerLastName((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="e.g. 8888989261"
                          value={billerPhone}
                          onInput={(e) => setBillerPhone((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="e.g. demo56@gmail.com"
                          value={billerEmail}
                          onInput={(e) => setBillerEmail((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Account / ID No</label>
                        <input
                          type="text"
                          placeholder="e.g. 102938492"
                          value={billerConsumerNo}
                          onInput={(e) => setBillerConsumerNo((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Due Amount</label>
                        <input
                          type="text"
                          placeholder="e.g. ₹1,450.00 / $45"
                          value={billerAmount}
                          onInput={(e) => setBillerAmount((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500 font-mono"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Subdivision / Area</label>
                        <input
                          type="text"
                          placeholder="e.g. North Zone"
                          value={billerSubdivision}
                          onInput={(e) => setBillerSubdivision((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Action Instructions</label>
                        <input
                          type="text"
                          placeholder="e.g. Fill form and submit"
                          value={billerInstructions}
                          onInput={(e) => setBillerInstructions((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Textarea */}
                <textarea
                  placeholder="Notes, reminders, order IDs, or general instructions..."
                  value={newTaskNotes}
                  onInput={(e) => setNewTaskNotes((e.target as HTMLTextAreaElement).value)}
                  rows={2}
                  class="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 resize-none leading-relaxed"
                />

                <div class="flex gap-2 pt-1">
                  <button
                    onClick={() => handleCreatePendingTask()}
                    class="flex-1 shimmer-btn h-8 rounded-lg text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 shadow-glow-sm active:scale-[0.98] transition"
                  >
                    <FloppyDiskIcon size={13} />
                    <span>Save Task & Schedule</span>
                  </button>
                  <button
                    onClick={() => handleCreatePendingTask({ andRun: true })}
                    title="Save task and start execution immediately"
                    class="px-3.5 h-8 shimmer-btn text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition"
                  >
                    <PlayIcon size={11} class="fill-current" />
                    <span>Save & Run</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search, Filter & Sort Controls */}
          <div class="space-y-2">
            <div class="relative">
              <input
                type="text"
                placeholder="Search tasks, notes, or target URLs..."
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                class="w-full glass-input rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-100 placeholder-zinc-500"
              />
              <MagnifyingGlassIcon size={13} class="absolute left-2.5 top-2.5 text-zinc-500 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  class="absolute right-2.5 top-2 text-zinc-400 hover:text-white p-0.5"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>

            <div class="flex items-center justify-between gap-1.5 text-[10px]">
              <div class="flex gap-1 overflow-x-auto py-0.5 scrollbar-none">
                {["ALL", "PENDING", "SCHEDULED", "DUE_SOON", "COMPLETED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    class={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition ${
                      statusFilter === st
                        ? "accent-pill-active"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as any)}
                class="bg-zinc-900 border border-white/[0.08] text-[10px] text-zinc-300 rounded-md px-1.5 py-0.5 shrink-0"
              >
                <option value="created">Created</option>
                <option value="dueDate">Due Date</option>
                <option value="nextRun">Next Run</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Task List Section */}
          <div class="flex-1 space-y-2.5 overflow-y-auto pr-0.5 min-h-[160px]">
            {pendingTasks.length === 0 ? (
              <div class="glass-card rounded-xl p-8 text-center text-zinc-500 space-y-1">
                <ListChecksIcon size={24} class="mx-auto text-zinc-600 mb-1" />
                <p class="text-xs text-zinc-400">
                  {searchQuery ? "No matching tasks found." : "No tasks or schedules created yet."}
                </p>
                <p class="text-[11px] text-zinc-500">
                  Click "+ Create New Task" above to automate forms, recurring bills, or reminders.
                </p>
              </div>
            ) : (
              pendingTasks.map((t) => (
                <div
                  key={t.id}
                  class={`glass-card rounded-xl p-3 transition-all duration-200 relative group shadow-subtle ${
                    t.status === "COMPLETED"
                      ? "opacity-60 border-white/[0.04]"
                      : t.status === "DUE_SOON"
                      ? "border-amber-500/40 bg-amber-950/10 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]"
                      : t.schedule?.enabled
                      ? "border-[var(--accent-border)] bg-white/[0.02]"
                      : "border-white/[0.07]"
                  }`}
                >
                  {/* Card Header Row */}
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.status === "COMPLETED"}
                        onChange={() => handleToggleTaskStatus(t)}
                        class="rounded bg-zinc-900 border-zinc-700 accent-[var(--accent-color)] focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span
                        class={`text-xs font-semibold truncate ${
                          t.status === "COMPLETED" ? "line-through text-zinc-500" : "text-zinc-100"
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    {/* Action Toolbar */}
                    <div class="flex items-center gap-1 shrink-0">
                      {t.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleExecutePendingTask(t)}
                          class="shimmer-btn text-white text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-sm active:scale-95"
                          title="Execute action with Agent"
                        >
                          <PlayIcon size={9} class="fill-current" />
                          <span>Run</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditTask(t)}
                        class="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/[0.05] transition"
                        title="Edit Task & Schedule"
                      >
                        <PencilSimpleIcon size={12} />
                      </button>
                      <button
                        onClick={() => handleCloneTask(t.id)}
                        class="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/[0.05] transition"
                        title="Duplicate Task"
                      >
                        <CopyIcon size={12} />
                      </button>
                      <button
                        onClick={() => handleDeletePendingTask(t.id)}
                        class="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition"
                        title="Delete Task"
                      >
                        <TrashIcon size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div class="flex flex-wrap items-center gap-1.5 text-[10px] mb-2">
                    {/* Priority Badge */}
                    <span
                      class={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border ${
                        t.priority === "HIGH"
                          ? "bg-rose-950/40 text-rose-300 border-rose-800/60"
                          : t.priority === "LOW"
                          ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                          : "bg-amber-950/40 text-amber-300 border-amber-800/60"
                      }`}
                    >
                      {t.priority}
                    </span>

                    {/* Schedule Badge */}
                    {t.schedule && t.schedule.enabled && (
                      <span class="accent-badge-subtle px-1.5 py-0.2 rounded inline-flex items-center gap-1 font-medium">
                        {t.schedule.autoExecute ? (
                          <LightningIcon size={10} class="text-amber-400 shrink-0" />
                        ) : (
                          <ClockIcon size={10} class="accent-text shrink-0" />
                        )}
                        <span>{formatScheduleText(t)}</span>
                      </span>
                    )}

                    {/* Next Run Time */}
                    {t.schedule?.nextRunAt && (
                      <span class="accent-text text-[10px] font-mono">
                        Next: {new Date(t.schedule.nextRunAt).toLocaleDateString([], { month: "short", day: "numeric" })} {new Date(t.schedule.nextRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}

                    {/* Due Date */}
                    {t.dueDate && (
                      <span class="text-zinc-400 inline-flex items-center gap-1">
                        <ClockIcon size={10} />
                        Due: <strong class={t.status === "DUE_SOON" ? "text-amber-400" : "text-zinc-300"}>{new Date(t.dueDate).toLocaleDateString()}</strong>
                      </span>
                    )}
                  </div>

                  {/* Profile / Target Details Summary */}
                  {t.billerInfo && (
                    <div class="bg-zinc-950/60 border border-white/[0.05] rounded-lg p-2 mb-2 text-[11px] space-y-1">
                      <div class="flex items-center justify-between accent-text font-medium">
                        <span class="inline-flex items-center gap-1 truncate">
                          <BuildingsIcon size={11} class="accent-text shrink-0" />
                          {t.billerInfo.providerName || t.billerInfo.billType}
                        </span>
                        <div class="flex items-center gap-1.5 shrink-0">
                          {t.billerInfo.billingCycle && (
                            <span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                              {t.billerInfo.billingCycle === "MONTHLY"
                                ? "Monthly"
                                : t.billerInfo.billingCycle === "QUARTERLY"
                                ? "Quarterly"
                                : t.billerInfo.billingCycle === "YEARLY"
                                ? "Yearly"
                                : t.billerInfo.billingCycle === "ADVANCE"
                                ? "Advance"
                                : t.billerInfo.billingCycle === "ONE_TIME"
                                ? "One-time"
                                : t.billerInfo.billingCycle}
                            </span>
                          )}
                          {t.billerInfo.amount && (
                            <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                              {t.billerInfo.amount}
                            </span>
                          )}
                          {t.billerInfo.consumerNumber && (
                            <span class="text-[10px] text-zinc-400 font-mono">#{t.billerInfo.consumerNumber}</span>
                          )}
                        </div>
                      </div>
                      {t.billerInfo.portalUrl && (
                        <div class="truncate text-[10px] accent-text flex items-center gap-1">
                          <LinkSimpleIcon size={10} class="shrink-0" />
                          <a href={t.billerInfo.portalUrl} target="_blank" rel="noreferrer" class="underline truncate hover:brightness-125">
                            {t.billerInfo.portalUrl}
                          </a>
                        </div>
                      )}
                      {(t.billerInfo.customerName || t.billerInfo.firstName || t.billerInfo.lastName || t.billerInfo.phoneNumber || t.billerInfo.emailAddress) && (
                        <div class="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-zinc-400 pt-1 border-t border-white/[0.04]">
                          {(t.billerInfo.firstName || t.billerInfo.lastName || t.billerInfo.customerName) && (
                            <span class="inline-flex items-center gap-1 text-zinc-200">
                              <UserIcon size={10} class="accent-text" />
                              {[t.billerInfo.firstName, t.billerInfo.lastName].filter(Boolean).join(" ") || t.billerInfo.customerName}
                            </span>
                          )}
                          {t.billerInfo.phoneNumber && (
                            <span class="inline-flex items-center gap-1 text-zinc-300">
                              <PhoneIcon size={10} class="accent-text" />
                              {t.billerInfo.phoneNumber}
                            </span>
                          )}
                          {t.billerInfo.emailAddress && (
                            <span class="inline-flex items-center gap-1 text-zinc-300 truncate max-w-[130px]">
                              <EnvelopeSimpleIcon size={10} class="accent-text" />
                              {t.billerInfo.emailAddress}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Commerce Price Watch Status Banner */}
                  {(t.category === "COMMERCE_WATCH" || t.priceCondition || t.billerInfo?.priceCondition) && (() => {
                    const cond = t.priceCondition || t.billerInfo?.priceCondition;
                    const targetPriceStr = cond?.targetPrice ? `≤ ₹${cond.targetPrice.toLocaleString("en-IN")}` : "Set target";
                    const currentPriceStr = cond?.currentPrice ? `₹${cond.currentPrice.toLocaleString("en-IN")}` : "Live Scan";
                    const isTriggered = cond?.priceMatched || (cond?.targetPrice && cond?.currentPrice && cond.currentPrice <= cond.targetPrice);

                    return (
                      <div class="bg-gradient-to-r from-emerald-950/40 via-zinc-950/60 to-emerald-950/30 border border-emerald-500/30 rounded-lg p-2.5 mb-2 text-[11px] space-y-1.5 shadow-sm">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-1.5 font-semibold text-emerald-300 text-xs">
                            <ShoppingCartSimpleIcon size={13} class="text-emerald-400" />
                            <span>Price Drop Watcher</span>
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          </div>
                          <span class={`text-[9px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                            isTriggered
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400 animate-bounce"
                              : "bg-white/[0.05] text-zinc-300 border-white/[0.1]"
                          }`}>
                            {isTriggered ? "Target Reached!" : `Every ${cond?.checkIntervalMinutes || 30}m`}
                          </span>
                        </div>

                        <div class="grid grid-cols-2 gap-2 text-[10px]">
                          <div class="p-1.5 rounded bg-black/40 border border-emerald-500/20">
                            <span class="text-zinc-400 block text-[9px]">Target Price</span>
                            <strong class="text-emerald-300 font-mono text-xs">{targetPriceStr}</strong>
                          </div>
                          <div class="p-1.5 rounded bg-black/40 border border-white/[0.06]">
                            <span class="text-zinc-400 block text-[9px]">Current / Detected</span>
                            <strong class="text-zinc-200 font-mono text-xs">{currentPriceStr}</strong>
                          </div>
                        </div>

                        <div class="flex items-center justify-between pt-1 border-t border-emerald-500/20 text-[10px]">
                          <div class="flex items-center gap-1 text-zinc-400">
                            <ShieldCheckIcon size={11} class="text-amber-400" />
                            <span>Auto-cart & pause for payment</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleExecutePendingTask(t)}
                            class="text-[10px] text-emerald-300 hover:text-emerald-200 font-semibold px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 transition flex items-center gap-1 active:scale-95"
                          >
                            <PlayIcon size={9} class="fill-current" />
                            <span>Check Now</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Notes Block */}
                  <div class="bg-zinc-950/40 border border-white/[0.04] rounded-lg p-2 text-xs mb-1.5">
                    <div class="flex items-center justify-between mb-0.5">
                      <span class="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <TagIcon size={10} />
                        Notes & Context
                      </span>
                      {editingNotesId !== t.id && (
                        <button
                          onClick={() => {
                            setEditingNotesId(t.id);
                            setCurrentNoteText(t.notes || "");
                          }}
                          class="text-[9px] text-zinc-400 hover:text-white inline-flex items-center gap-0.5 transition"
                        >
                          <PencilSimpleIcon size={10} />
                          Edit
                        </button>
                      )}
                    </div>

                    {editingNotesId === t.id ? (
                      <div class="space-y-1.5 mt-1">
                        <textarea
                          value={currentNoteText}
                          onInput={(e) => setCurrentNoteText((e.target as HTMLTextAreaElement).value)}
                          rows={2}
                          class="w-full glass-input rounded-md p-1.5 text-xs text-zinc-200 resize-none leading-relaxed"
                        />
                        <div class="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            class="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(t.id)}
                            class="text-[10px] accent-btn-primary px-2 py-0.5 rounded-md font-medium"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p class="text-[11px] text-zinc-400 italic">
                        {t.notes || "No notes attached."}
                      </p>
                    )}
                  </div>

                  {/* Run History Accordion */}
                  {Array.isArray(t.executionHistory) && t.executionHistory.length > 0 && (
                    <div class="pt-1 border-t border-white/[0.04]">
                      <button
                        onClick={() =>
                          setExpandedHistoryTaskId(expandedHistoryTaskId === t.id ? null : t.id)
                        }
                        class="w-full text-left text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center justify-between py-0.5 transition"
                      >
                        <span class="inline-flex items-center gap-1 font-medium">
                          <ClockIcon size={10} />
                          Run History ({t.executionHistory.length} executions)
                        </span>
                        {expandedHistoryTaskId === t.id ? <CaretUpIcon size={10} /> : <CaretDownIcon size={10} />}
                      </button>

                      {expandedHistoryTaskId === t.id && (
                        <div class="mt-1.5 space-y-1 pl-1.5 border-l-2 border-[var(--accent-color)] animate-fade-in">
                          {t.executionHistory.map((run) => (
                            <div key={run.id} class="text-[10px] bg-zinc-950/80 p-2 rounded-md space-y-0.5 border border-white/[0.04]">
                              <div class="flex items-center justify-between">
                                <span
                                  class={`font-bold ${
                                    run.status === "SUCCESS"
                                      ? "text-emerald-400"
                                      : run.status === "FAILED"
                                      ? "text-rose-400"
                                      : "text-zinc-400"
                                  }`}
                                >
                                  {run.status === "SUCCESS" ? "Succeeded" : run.status === "FAILED" ? "Failed" : "Cancelled"}
                                </span>
                                <span class="text-zinc-500 font-mono">{new Date(run.runAt).toLocaleTimeString()}</span>
                              </div>
                              <p class="text-zinc-300 leading-tight">{run.summary || run.error}</p>
                              <div class="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[9px] text-zinc-500">
                                <div class="flex gap-2">
                                  <span>Duration: {(run.durationMs / 1000).toFixed(1)}s</span>
                                  <span>Steps: {run.stepsCount || (run.steps ? run.steps.length : 1)}</span>
                                </div>
                                <button
                                  onClick={() => handleOpenHistoricalReplay(t.title, run)}
                                  class="text-[9px] accent-badge-subtle hover:brightness-110 px-2 py-0.5 rounded inline-flex items-center gap-1 transition"
                                >
                                  <FilmReelIcon size={10} />
                                  <span>Replay & Inspect</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Full Task & Schedule Edit Modal Dialog */}
      {editingTask && (
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-hidden animate-fade-in overscroll-none">
          <div class="glass-panel rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-[var(--accent-border)] animate-scale-in">
            {/* Modal Header */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-zinc-950/90 shrink-0">
              <div class="flex items-center gap-2 accent-text font-bold text-xs">
                <PencilSimpleIcon size={15} />
                <span>Edit Task, Profile & Schedule</span>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                class="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div class="p-4 overflow-y-auto overscroll-contain space-y-3.5 text-xs bg-zinc-950/70 flex-1 min-h-0">
              {/* Task Title */}
              <div>
                <label class="text-[10px] text-zinc-400 block mb-1 font-semibold uppercase tracking-wider">
                  Task Title <span class="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onInput={(e) => setEditTitle((e.target as HTMLInputElement).value)}
                  class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-100 font-medium"
                />
              </div>

              {/* Priority, Category, Billing Timeline & Due Date */}
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[10px] text-zinc-400 block mb-1 font-medium truncate">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority((e.target as HTMLSelectElement).value as TaskPriority)}
                    class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label class="text-[10px] text-zinc-400 block mb-1 font-medium truncate">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory((e.target as HTMLSelectElement).value as TaskCategory)}
                    class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                  >
                    <option value="GENERAL">General Web</option>
                    <option value="FORM_FILL">Form Autofill</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="WATER">Water</option>
                    <option value="GAS">Gas</option>
                    <option value="INTERNET">Internet</option>
                    <option value="MOBILE">Mobile</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="SHOPPING">Shopping</option>
                    <option value="COMMERCE_WATCH">Commerce Price Watch</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label class="text-[10px] text-zinc-400 block mb-1 font-medium truncate">Billing Timeline</label>
                  <select
                    value={editBillingCycle}
                    onChange={(e) => setEditBillingCycle((e.target as HTMLSelectElement).value as BillingCycle)}
                    class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                  >
                    <option value="MONTHLY">Monthly Bill</option>
                    <option value="QUARTERLY">Quarterly Bill</option>
                    <option value="YEARLY">Yearly / Annual Bill</option>
                    <option value="ADVANCE">Advance Payment</option>
                    <option value="ONE_TIME">One-Time Payment</option>
                    <option value="CUSTOM">Custom Timeline</option>
                  </select>
                </div>

                <div>
                  <label class="text-[10px] text-zinc-400 block mb-1 font-medium truncate">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onInput={(e) => setEditDueDate((e.target as HTMLInputElement).value)}
                    class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                  />
                </div>
              </div>

              {/* Target Webpage / Portal URL */}
              <div>
                <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Target URL / Portal Link</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editPortalUrl}
                  onInput={(e) => setEditPortalUrl((e.target as HTMLInputElement).value)}
                  class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                />
              </div>

              {/* User Profile & Form Details Group */}
              <div class="glass-panel rounded-xl p-3 space-y-2.5 border-white/[0.08] max-h-[300px] overflow-y-auto overscroll-contain">
                <div class="text-[11px] font-semibold accent-text flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <div class="flex items-center gap-1.5">
                    <UserIcon size={13} />
                    <span>User Profile & Biller Info</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(null);
                      setIsCreatingNewProfile(false);
                      setIsProfileVaultModalOpen(true);
                    }}
                    class="text-[10px] accent-text hover:brightness-125 font-medium inline-flex items-center gap-1"
                  >
                    <IdentificationCardIcon size={11} />
                    <span>Vault</span>
                  </button>
                </div>

                {/* Identity Preset Selector in Edit Modal */}
                {profiles.length > 0 && (
                  <div class="bg-[var(--accent-bg-subtle)] p-2 rounded-lg border border-[var(--accent-border)]">
                    <label class="text-[10px] accent-text block mb-1 font-semibold flex items-center gap-1">
                      <SparkleIcon size={11} />
                      <span>Autofill from Identity Vault Preset</span>
                    </label>
                    <select
                      value={editProfileId}
                      onChange={(e) => handleApplyProfileToEditForm((e.target as HTMLSelectElement).value)}
                      class="w-full glass-input rounded-lg px-2 h-7 text-xs text-zinc-200 font-medium"
                    >
                      <option value="">-- Choose Profile Preset --</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} {p.isDefault ? "★ (Default)" : ""} - {[p.firstName, p.lastName].filter(Boolean).join(" ") || p.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}


                {/* First Name & Last Name (Separate inputs) */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">First Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={editFirstName}
                      onInput={(e) => setEditFirstName((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={editLastName}
                      onInput={(e) => setEditLastName((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                {/* Phone & Email */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 8888989261"
                      value={editPhone}
                      onInput={(e) => setEditPhone((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. demo56@gmail.com"
                      value={editEmail}
                      onInput={(e) => setEditEmail((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                {/* Site/Provider & Account No */}
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Site / Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. Google Demo, CESC"
                      value={editProvider}
                      onInput={(e) => setEditProvider((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Account / ID No</label>
                    <input
                      type="text"
                      placeholder="e.g. 102938492"
                      value={editConsumerNo}
                      onInput={(e) => setEditConsumerNo((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Due Amount</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹1,450.00"
                      value={editAmount}
                      onInput={(e) => setEditAmount((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 font-mono"
                    />
                  </div>
                </div>

                {/* Subdivision & Custom Instructions */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Subdivision / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. North Zone"
                      value={editSubdivision}
                      onInput={(e) => setEditSubdivision((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Action Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Fill form and submit"
                      value={editInstructions}
                      onInput={(e) => setEditInstructions((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Configuration Group */}
              <div class="glass-panel rounded-xl p-3 space-y-2.5 border-white/[0.08]">
                <div class="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <div class="flex items-center gap-1.5 accent-text font-semibold text-[11px]">
                    <RepeatIcon size={13} />
                    <span>Scheduling & Auto-Execution</span>
                  </div>
                  <label class="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editScheduleEnabled}
                      onChange={(e) => setEditScheduleEnabled((e.target as HTMLInputElement).checked)}
                      class="rounded bg-zinc-900 border-zinc-700 accent-[var(--accent-color)] focus:ring-0 cursor-pointer"
                    />
                    <span>Enable Schedule</span>
                  </label>
                </div>

                {editScheduleEnabled && (
                  <>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Frequency</label>
                        <select
                          value={editScheduleFreq}
                          onChange={(e) => setEditScheduleFreq((e.target as HTMLSelectElement).value as ScheduleFrequency)}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        >
                          <option value="ONCE">One-Time Run</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="CUSTOM_DAYS">Custom Interval</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Trigger Time</label>
                        <input
                          type="time"
                          value={editScheduleTime}
                          onInput={(e) => setEditScheduleTime((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    </div>

                    {editScheduleFreq === "MONTHLY" && (
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Day of Month (1 - 31)</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={editScheduleDayOfMonth}
                          onInput={(e) => setEditScheduleDayOfMonth(Number((e.target as HTMLInputElement).value))}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    )}

                    {editScheduleFreq === "WEEKLY" && (
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Day of Week</label>
                        <select
                          value={editScheduleDayOfWeek}
                          onChange={(e) => setEditScheduleDayOfWeek(Number((e.target as HTMLSelectElement).value))}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        >
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                          <option value={0}>Sunday</option>
                        </select>
                      </div>
                    )}

                    {editScheduleFreq === "CUSTOM_DAYS" && (
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Repeat Every N Days</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={editScheduleIntervalDays}
                          onInput={(e) => setEditScheduleIntervalDays(Number((e.target as HTMLInputElement).value))}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    )}

                    <div class="bg-[var(--accent-bg-subtle)] p-2.5 rounded-lg border border-[var(--accent-border)] flex items-center justify-between">
                      <div class="flex flex-col">
                        <span class="text-[11px] font-semibold accent-text">Auto-Execute with Agent</span>
                        <span class="text-[10px] text-zinc-400">Launch browser execution automatically</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editScheduleAutoExecute}
                        onChange={(e) => setEditScheduleAutoExecute((e.target as HTMLInputElement).checked)}
                        class="rounded bg-zinc-900 border-zinc-700 accent-[var(--accent-color)] focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              <div>
                <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Notes & Context</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onInput={(e) => setEditNotes((e.target as HTMLTextAreaElement).value)}
                  placeholder="Additional instructions or notes..."
                  class="w-full glass-input rounded-lg p-2 text-xs text-zinc-200 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.08] bg-zinc-950/90">
              <button
                onClick={() => setEditingTask(null)}
                class="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditTask}
                disabled={!editTitle.trim()}
                class="shimmer-btn px-4 py-1.5 rounded-lg text-xs text-white font-semibold shadow-glow-sm active:scale-95 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Profile Identity Vault Modal */}
      {isProfileVaultModalOpen && (
        <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-hidden animate-fade-in overscroll-none">
          <div class="glass-panel rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--accent-border)] animate-scale-in">
            {/* Modal Header */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-zinc-950/90 shrink-0">
              <div class="flex items-center gap-2 accent-text font-bold text-xs">
                <IdentificationCardIcon size={16} />
                <span>Multi-Profile Identity Vault</span>
              </div>
              <button
                onClick={() => {
                  setIsProfileVaultModalOpen(false);
                  setEditingProfile(null);
                  setIsCreatingNewProfile(false);
                }}
                class="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Modal Body with independent scrolling */}
            <div class="p-4 overflow-y-auto overscroll-contain space-y-4 text-xs bg-zinc-950/70 flex-1 min-h-0">
              {editingProfile || isCreatingNewProfile ? (
                /* Profile Editor Form View */
                <div class="space-y-3.5 animate-fade-in">
                  <div class="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <button
                      onClick={() => {
                        setEditingProfile(null);
                        setIsCreatingNewProfile(false);
                      }}
                      class="text-xs accent-text hover:brightness-125 inline-flex items-center gap-1 font-semibold"
                    >
                      <span>← Back to Identities</span>
                    </button>
                    <span class="text-[11px] font-bold text-zinc-300">
                      {isCreatingNewProfile ? "Create Identity Profile" : `Edit "${profLabel}"`}
                    </span>
                  </div>

                  {/* Profile Label */}
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-semibold uppercase tracking-wider">
                      Identity Label <span class="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Personal, Work, Family / Home, Freelance"
                      value={profLabel}
                      onInput={(e) => setProfLabel((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-100 font-medium"
                    />
                  </div>

                  {/* Icon & Color Selector */}
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-[10px] text-zinc-400 block mb-1.5 font-medium">Icon</label>
                      <div class="flex flex-wrap gap-1.5">
                        {(["user", "briefcase", "house", "sparkle", "buildings", "credit-card", "tag"] as ProfileIconType[]).map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setProfIcon(ic)}
                            class={`w-7 h-7 rounded-lg flex items-center justify-center border transition ${
                              profIcon === ic
                                ? "accent-btn-primary shadow-glow-sm"
                                : "bg-zinc-900 text-zinc-400 border-white/[0.08] hover:text-white"
                            }`}
                          >
                            {renderProfileIcon(ic, 13)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label class="text-[10px] text-zinc-400 block mb-1.5 font-medium">Color Theme</label>
                      <div class="flex flex-wrap gap-1.5">
                        {(["indigo", "emerald", "amber", "violet", "rose", "blue", "cyan"] as ProfileColor[]).map((col) => {
                          const colStyles = getProfileColorStyles(col);
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setProfColor(col)}
                              class={`w-7 h-7 rounded-lg flex items-center justify-center border transition ${
                                profColor === col
                                  ? `${colStyles.bgLight} ${colStyles.border} ring-2 ring-white/30`
                                  : "bg-zinc-900 border-white/[0.08] hover:border-white/20"
                              }`}
                            >
                              <span class={`w-3 h-3 rounded-full ${colStyles.dot}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Personal Credentials */}
                  <div class="glass-panel rounded-xl p-3 space-y-2.5 border-white/[0.08]">
                    <div class="text-[11px] font-semibold accent-text flex items-center gap-1.5 pb-1 border-b border-white/[0.06]">
                      <UserIcon size={13} />
                      <span>Personal Contact Information</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">First Name</label>
                        <input
                          type="text"
                          placeholder="e.g. John"
                          value={profFirstName}
                          onInput={(e) => setProfFirstName((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Last Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Doe"
                          value={profLastName}
                          onInput={(e) => setProfLastName((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Email Address</label>
                        <input
                          type="email"
                          placeholder="e.g. john.doe@gmail.com"
                          value={profEmail}
                          onInput={(e) => setProfEmail((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={profPhone}
                          onInput={(e) => setProfPhone((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div class="glass-panel rounded-xl p-3 space-y-2.5 border-white/[0.08]">
                    <div class="text-[11px] font-semibold accent-text flex items-center gap-1.5 pb-1 border-b border-white/[0.06]">
                      <HouseIcon size={13} />
                      <span>Address & Location (Optional)</span>
                    </div>

                    <div>
                      <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Street Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 124 Park Street, Suite 4B"
                        value={profStreet}
                        onInput={(e) => setProfStreet((e.target as HTMLInputElement).value)}
                        class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">City</label>
                        <input
                          type="text"
                          placeholder="e.g. Kolkata / Mumbai"
                          value={profCity}
                          onInput={(e) => setProfCity((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">State / Region</label>
                        <input
                          type="text"
                          placeholder="e.g. West Bengal"
                          value={profState}
                          onInput={(e) => setProfState((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Postal / PIN Code</label>
                        <input
                          type="text"
                          placeholder="e.g. 700016"
                          value={profPostalCode}
                          onInput={(e) => setProfPostalCode((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Country</label>
                        <input
                          type="text"
                          placeholder="e.g. India"
                          value={profCountry}
                          onInput={(e) => setProfCountry((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business & Tax Details */}
                  <div class="glass-panel rounded-xl p-3 space-y-2.5 border-white/[0.08]">
                    <div class="text-[11px] font-semibold accent-text flex items-center gap-1.5 pb-1 border-b border-white/[0.06]">
                      <BriefcaseIcon size={13} />
                      <span>Business & Tax Info (Optional)</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Company Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Studio LLC"
                          value={profCompanyName}
                          onInput={(e) => setProfCompanyName((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">GST / Tax ID</label>
                        <input
                          type="text"
                          placeholder="e.g. 19ABCDE1234F1Z5"
                          value={profTaxId}
                          onInput={(e) => setProfTaxId((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 font-mono"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Department</label>
                        <input
                          type="text"
                          placeholder="e.g. Engineering / Finance"
                          value={profDepartment}
                          onInput={(e) => setProfDepartment((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. Lead Architect"
                          value={profDesignation}
                          onInput={(e) => setProfDesignation((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Key-Value Attributes */}
                  <div class="glass-panel rounded-xl p-3 space-y-2 border-white/[0.08]">
                    <div class="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                      <span class="text-[11px] font-semibold accent-text flex items-center gap-1.5">
                        <TagIcon size={13} />
                        <span>Custom Form Attributes</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setProfCustomAttrs([...profCustomAttrs, { key: "", value: "" }])}
                        class="text-[10px] accent-text hover:brightness-125 font-semibold inline-flex items-center gap-1"
                      >
                        <PlusIcon size={11} />
                        <span>Add Attribute</span>
                      </button>
                    </div>

                    {profCustomAttrs.length === 0 ? (
                      <p class="text-[10px] text-zinc-500 italic py-1">
                        No custom attributes (e.g. Passport, PAN Card, Voter ID, Mother's Name).
                      </p>
                    ) : (
                      profCustomAttrs.map((attr, idx) => (
                        <div key={idx} class="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Attribute Key (e.g. PAN Card)"
                            value={attr.key}
                            onInput={(e) => {
                              const updated = [...profCustomAttrs];
                              updated[idx].key = (e.target as HTMLInputElement).value;
                              setProfCustomAttrs(updated);
                            }}
                            class="flex-1 glass-input rounded-md px-2 h-7 text-xs text-zinc-200"
                          />
                          <input
                            type="text"
                            placeholder="Attribute Value"
                            value={attr.value}
                            onInput={(e) => {
                              const updated = [...profCustomAttrs];
                              updated[idx].value = (e.target as HTMLInputElement).value;
                              setProfCustomAttrs(updated);
                            }}
                            class="flex-1 glass-input rounded-md px-2 h-7 text-xs text-zinc-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = profCustomAttrs.filter((_, i) => i !== idx);
                              setProfCustomAttrs(updated);
                            }}
                            class="text-zinc-500 hover:text-rose-400 p-1"
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Notes & Instructions</label>
                    <textarea
                      rows={2}
                      value={profNotes}
                      onInput={(e) => setProfNotes((e.target as HTMLTextAreaElement).value)}
                      placeholder="Special instructions for the autonomous agent when this profile is active..."
                      class="w-full glass-input rounded-lg p-2 text-xs text-zinc-200 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Editor Footer Actions */}
                  <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile(null);
                        setIsCreatingNewProfile(false);
                      }}
                      class="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={!profLabel.trim()}
                      class="shimmer-btn px-4 py-1.5 rounded-lg text-xs text-white font-semibold shadow-glow-sm active:scale-95 transition"
                    >
                      Save Identity Profile
                    </button>
                  </div>
                </div>
              ) : (
                /* Profile List Overview View */
                <div class="space-y-3 animate-fade-in">
                  <div class="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                    <div>
                      <h4 class="text-xs font-bold text-zinc-100">Saved Identities</h4>
                      <p class="text-[10px] text-zinc-400">
                        Autonomous agent uses credentials from selected identity
                      </p>
                    </div>
                    <button
                      onClick={handleOpenCreateProfile}
                      class="shimmer-btn text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-glow-sm active:scale-95 transition"
                    >
                      <PlusIcon size={12} />
                      <span>New Identity</span>
                    </button>
                  </div>

                  <div class="space-y-2.5">
                    {profiles.map((prof) => {
                      const profStyles = getProfileColorStyles(prof.color);
                      const isSelected = prof.id === activeProfileId;
                      const fullName = [prof.firstName, prof.lastName].filter(Boolean).join(" ");
                      return (
                        <div
                          key={prof.id}
                          class={`glass-card rounded-xl p-3 border transition ${
                            isSelected
                              ? `${profStyles.border} ${profStyles.bgLight} shadow-glow-sm`
                              : "border-white/[0.07] hover:border-white/[0.15]"
                          }`}
                        >
                          <div class="flex items-start justify-between gap-2 mb-2">
                            <div class="flex items-center gap-2 min-w-0">
                              <div
                                class={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${profStyles.badge}`}
                              >
                                {renderProfileIcon(prof.icon, 14)}
                              </div>
                              <div class="flex flex-col min-w-0">
                                <div class="flex items-center gap-1.5">
                                  <span class="text-xs font-bold text-zinc-100 truncate">{prof.label}</span>
                                  {prof.isDefault && (
                                    <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold inline-flex items-center gap-0.5">
                                      <StarIcon size={9} class="fill-current" />
                                      <span>Default</span>
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span class="text-[9px] px-1.5 py-0.2 rounded accent-badge-subtle font-semibold">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span class="text-[10px] text-zinc-400 font-medium truncate">
                                  {fullName || "No Name Assigned"}
                                </span>
                              </div>
                            </div>

                            {/* Actions Toolbar */}
                            <div class="flex items-center gap-1 shrink-0">
                              {!isSelected && (
                                <button
                                  onClick={() => handleSelectActiveProfile(prof.id)}
                                  class="text-[10px] bg-zinc-800 hover:accent-btn-primary text-zinc-300 hover:text-white px-2 py-0.5 rounded-md transition font-medium"
                                >
                                  Use Now
                                </button>
                              )}
                              {!prof.isDefault && (
                                <button
                                  onClick={() => handleSetDefaultProfile(prof.id)}
                                  class="text-zinc-400 hover:text-amber-400 p-1 rounded hover:bg-white/[0.05] transition"
                                  title="Set as Default Identity"
                                >
                                  <StarIcon size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditProfile(prof)}
                                class="text-zinc-400 hover:accent-text p-1 rounded hover:bg-white/[0.05] transition"
                                title="Edit Identity Profile"
                              >
                                <PencilSimpleIcon size={13} />
                              </button>
                              {profiles.length > 1 && (
                                <button
                                  onClick={() => handleDeleteProfile(prof.id)}
                                  class="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition"
                                  title="Delete Identity Profile"
                                >
                                  <TrashIcon size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Profile Details Snippet */}
                          <div class="bg-zinc-950/60 rounded-lg p-2 text-[10px] text-zinc-300 space-y-1 border border-white/[0.04]">
                            <div class="flex flex-wrap gap-x-3 gap-y-0.5">
                              {prof.email && (
                                <span class="inline-flex items-center gap-1 text-zinc-300">
                                  <EnvelopeSimpleIcon size={10} class="accent-text" />
                                  <span class="truncate max-w-[150px]">{prof.email}</span>
                                </span>
                              )}
                              {prof.phone && (
                                <span class="inline-flex items-center gap-1 text-zinc-300">
                                  <PhoneIcon size={10} class="accent-text" />
                                  <span>{prof.phone}</span>
                                </span>
                              )}
                            </div>

                            {(prof.address?.city || prof.address?.state || prof.address?.postalCode) && (
                              <div class="flex items-center gap-1 text-zinc-400 truncate">
                                <HouseIcon size={10} class="accent-text shrink-0" />
                                <span class="truncate">
                                  {[prof.address.street, prof.address.city, prof.address.state, prof.address.postalCode]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              </div>
                            )}

                            {(prof.business?.companyName || prof.business?.taxIdOrGst) && (
                              <div class="flex items-center gap-2 text-zinc-400 truncate pt-0.5 border-t border-white/[0.04]">
                                <BriefcaseIcon size={10} class="accent-text shrink-0" />
                                <span class="truncate">
                                  {prof.business.companyName}
                                  {prof.business.taxIdOrGst ? ` (GST: ${prof.business.taxIdOrGst})` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-end px-4 py-2.5 border-t border-white/[0.08] bg-zinc-950/90 shrink-0">
              <button
                onClick={() => {
                  setIsProfileVaultModalOpen(false);
                  setEditingProfile(null);
                  setIsCreatingNewProfile(false);
                }}
                class="px-4 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Execution Replay & Step Inspector Modal */}
      {isReplayModalOpen && (
        <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2.5 overflow-hidden animate-fade-in">
          <div class="glass-panel rounded-2xl shadow-2xl w-full max-w-lg h-[92vh] flex flex-col overflow-hidden border border-[var(--accent-border)] bg-zinc-950/95 animate-scale-in">
            {/* Replay Header */}
            <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] bg-zinc-950/90 shrink-0">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-6 h-6 rounded-lg accent-gradient-bg flex items-center justify-center text-white shadow-glow-sm shrink-0">
                  <FilmReelIcon size={13} />
                </div>
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-zinc-100 truncate">Execution Timeline Replay</span>
                    <span
                      class={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        replayStatus === "SUCCESS"
                          ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/40"
                          : replayStatus === "FAILED"
                          ? "bg-rose-950/50 text-rose-300 border-rose-500/40"
                          : replayStatus === "CANCELLED"
                          ? "bg-zinc-900 text-zinc-400 border-zinc-700"
                          : "accent-badge-subtle animate-pulse"
                      }`}
                    >
                      {replayStatus === "SUCCESS"
                        ? "Completed"
                        : replayStatus === "FAILED"
                        ? "Failed"
                        : replayStatus === "CANCELLED"
                        ? "Cancelled"
                        : "Executing"}
                    </span>
                  </div>
                  <span class="text-[10px] text-zinc-400 truncate max-w-[280px]">
                    {replayTitle}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsReplayPlaying(false);
                  setIsReplayModalOpen(false);
                }}
                class="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition"
              >
                <XIcon size={15} />
              </button>
            </div>

            {/* Replay Player Controls Bar */}
            <div class="px-3.5 py-2 border-b border-white/[0.06] bg-zinc-900/60 flex items-center justify-between gap-2 shrink-0">
              {/* Playback Buttons */}
              <div class="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setSelectedStepIndex(0);
                    setIsReplayPlaying(false);
                  }}
                  disabled={replaySteps.length === 0 || selectedStepIndex === 0}
                  class="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 transition"
                  title="First Step"
                >
                  <ArrowCounterClockwiseIcon size={12} />
                </button>
                <button
                  onClick={() => {
                    setSelectedStepIndex((prev) => Math.max(0, prev - 1));
                    setIsReplayPlaying(false);
                  }}
                  disabled={replaySteps.length === 0 || selectedStepIndex === 0}
                  class="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
                >
                  Prev
                </button>
                <button
                  onClick={() => {
                    if (selectedStepIndex >= replaySteps.length - 1) {
                      setSelectedStepIndex(0);
                    }
                    setIsReplayPlaying(!isReplayPlaying);
                  }}
                  disabled={replaySteps.length <= 1}
                  class={`px-2.5 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1 transition ${
                    isReplayPlaying
                      ? "bg-amber-600 text-white shadow-glow-sm"
                      : "accent-btn-primary shadow-glow-sm"
                  }`}
                >
                  {isReplayPlaying ? (
                    <>
                      <span>❚❚</span>
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <PlayIcon size={9} class="fill-current" />
                      <span>{selectedStepIndex >= replaySteps.length - 1 ? "Replay" : "Play"}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedStepIndex((prev) => Math.min(replaySteps.length - 1, prev + 1));
                    setIsReplayPlaying(false);
                  }}
                  disabled={replaySteps.length === 0 || selectedStepIndex >= replaySteps.length - 1}
                  class="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>

              {/* Step Scrubber / Counter */}
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] text-zinc-400 font-mono shrink-0">
                  Step <strong class="accent-text">{replaySteps.length > 0 ? selectedStepIndex + 1 : 0}</strong> of{" "}
                  {replaySteps.length}
                </span>

                {/* Speed Multiplier Selector */}
                <select
                  value={replayPlaybackSpeed}
                  onChange={(e) => setReplayPlaybackSpeed(Number((e.target as HTMLSelectElement).value))}
                  class="bg-zinc-950 border border-white/[0.08] text-[10px] text-zinc-300 rounded px-1.5 py-0.5"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
              </div>
            </div>

            {/* Timeline Scrubber Bar */}
            {replaySteps.length > 0 && (
              <div class="px-3.5 py-1.5 bg-zinc-950/80 border-b border-white/[0.05] shrink-0">
                <div class="flex items-center gap-1 w-full overflow-x-auto py-1">
                  {replaySteps.map((s, idx) => {
                    const isCurrent = idx === selectedStepIndex;
                    const isFailed = s.status === "FAILED" || s.actionType === "FAIL";
                    return (
                      <button
                        key={s.id || idx}
                        onClick={() => {
                          setSelectedStepIndex(idx);
                          setIsReplayPlaying(false);
                        }}
                        class={`h-2.5 rounded-full transition-all flex-1 min-w-[12px] relative group ${
                          isCurrent
                            ? isFailed
                              ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] scale-y-125"
                              : "accent-btn-primary scale-y-125"
                            : idx < selectedStepIndex
                            ? "accent-badge-subtle"
                            : "bg-zinc-800 hover:bg-zinc-700"
                        }`}
                        title={`Step ${idx + 1}: [${s.actionType}] ${s.description}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Replay Workspace (2-Column split: Step Inspector on top, Timeline List below) */}
            <div class="flex-1 overflow-y-auto p-3.5 space-y-3 bg-zinc-950/80 text-xs">
              {replaySteps.length === 0 ? (
                <div class="h-full flex flex-col items-center justify-center text-zinc-500 py-12 space-y-2 text-center">
                  <FilmReelIcon size={28} class="text-zinc-600" />
                  <p class="text-xs text-zinc-400">No execution steps recorded for this task run.</p>
                  <p class="text-[11px] text-zinc-500">Run a goal to capture real-time DOM element actions.</p>
                </div>
              ) : (
                <>
                  {/* Active Step Visual Inspector Card */}
                  {(() => {
                    const currentStep = replaySteps[selectedStepIndex] || replaySteps[0];
                    if (!currentStep) return null;

                    const isClick = currentStep.actionType === "CLICK";
                    const isType = currentStep.actionType === "TYPE";
                    const isSelect = currentStep.actionType === "SELECT";
                    const isNavigate = currentStep.actionType === "NAVIGATE";
                    const isComplete = currentStep.actionType === "COMPLETE";
                    const isFail = currentStep.actionType === "FAIL" || currentStep.status === "FAILED";

                    return (
                      <div class="glass-card rounded-xl p-3 border border-[var(--accent-border)] bg-gradient-to-b from-white/[0.03] to-zinc-950/60 shadow-glass space-y-2.5 animate-fade-in">
                        {/* Step Header */}
                        <div class="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="w-6 h-6 rounded-md accent-badge-subtle flex items-center justify-center font-mono font-bold text-xs shrink-0">
                              #{currentStep.stepNumber || selectedStepIndex + 1}
                            </span>
                            <div class="flex items-center gap-1.5 truncate">
                              <span
                                class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isClick
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : isType
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                    : isSelect
                                    ? "accent-badge-subtle"
                                    : isNavigate
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : isComplete
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : isFail
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                                }`}
                              >
                                {currentStep.actionType}
                              </span>
                              <span class="text-xs font-semibold text-zinc-100 truncate">
                                {currentStep.targetName || currentStep.description}
                              </span>
                            </div>
                          </div>
                          <span class="text-[10px] text-zinc-500 font-mono shrink-0">
                            {new Date(currentStep.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>

                        {/* Step Action Description */}
                        <div class="bg-zinc-950/70 rounded-lg p-2.5 border border-white/[0.05] space-y-1.5">
                          <div class="text-[11px] text-zinc-200 leading-relaxed font-medium">
                            {currentStep.description}
                          </div>

                          {/* Typed Input or Selected Value Highlight */}
                          {currentStep.inputValue && (
                            <div class="flex items-center gap-1.5 text-[11px] accent-badge-subtle px-2 py-1 rounded">
                              <span class="text-zinc-400 font-mono text-[10px]">Value Applied:</span>
                              <strong class="accent-text font-mono break-all">{currentStep.inputValue}</strong>
                            </div>
                          )}
                        </div>

                        {/* DOM Element & Page Inspection Details */}
                        <div class="grid grid-cols-2 gap-2 text-[10px]">
                          {/* Target Element Selector */}
                          <div class="bg-zinc-950/60 p-2 rounded-lg border border-white/[0.04] space-y-0.5">
                            <span class="text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                              <CursorClickIcon size={10} class="accent-text" />
                              Target Locator
                            </span>
                            <p class="font-mono text-zinc-300 truncate text-[10px]" title={currentStep.targetSelector || "N/A"}>
                              {currentStep.targetSelector || currentStep.targetRole || "Dynamic Document Node"}
                            </p>
                          </div>

                          {/* Active Webpage URL */}
                          <div class="bg-zinc-950/60 p-2 rounded-lg border border-white/[0.04] space-y-0.5">
                            <span class="text-zinc-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                              <BrowsersIcon size={10} class="text-cyan-400" />
                              Page Snapshot
                            </span>
                            <p class="text-zinc-300 truncate text-[10px]" title={currentStep.url || currentStep.pageTitle || "Target Portal"}>
                              {currentStep.pageTitle || currentStep.url || "Browser Tab Context"}
                            </p>
                          </div>
                        </div>

                        {/* Status & Timing Metrics */}
                        <div class="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px] text-zinc-500">
                          <div class="flex items-center gap-2">
                            <span class="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircleIcon size={11} />
                              Verified Valid
                            </span>
                            {currentStep.elementsCount !== undefined && (
                              <span class="text-zinc-400">
                                {currentStep.elementsCount} interactive DOM nodes
                              </span>
                            )}
                          </div>
                          {currentStep.durationMs !== undefined && (
                            <span class="font-mono text-zinc-400">
                              +{(currentStep.durationMs / 1000).toFixed(2)}s step latency
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Complete Execution Step Timeline List */}
                  <div class="space-y-1.5 pt-1">
                    <div class="flex items-center justify-between pb-1">
                      <span class="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ListChecksIcon size={13} class="accent-text" />
                        <span>Execution Trace ({replaySteps.length} Steps)</span>
                      </span>
                      <span class="text-[10px] text-zinc-500">Click any step to inspect</span>
                    </div>

                    <div class="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                      {replaySteps.map((step, idx) => {
                        const isSelected = idx === selectedStepIndex;
                        const isFail = step.status === "FAILED" || step.actionType === "FAIL";
                        return (
                          <div
                            key={step.id || idx}
                            onClick={() => {
                              setSelectedStepIndex(idx);
                              setIsReplayPlaying(false);
                            }}
                            class={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                              isSelected
                                ? "accent-badge-subtle shadow-glow-sm"
                                : "bg-zinc-950/50 border-white/[0.04] hover:border-white/[0.12] hover:bg-zinc-900/60"
                            }`}
                          >
                            <div class="flex items-center gap-2 min-w-0">
                              <span
                                class={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                                  isSelected
                                    ? "accent-btn-primary"
                                    : "bg-zinc-900 text-zinc-400 border border-white/[0.06]"
                                }`}
                              >
                                {step.stepNumber || idx + 1}
                              </span>
                              <span
                                class={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                                  isFail
                                    ? "bg-rose-950 text-rose-400 border border-rose-800"
                                    : step.actionType === "CLICK"
                                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                                    : step.actionType === "TYPE"
                                    ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                                    : "bg-zinc-900 text-zinc-300 border border-zinc-700"
                                }`}
                              >
                                {step.actionType}
                              </span>
                              <span
                                class={`truncate text-[11px] font-medium ${
                                  isSelected ? "accent-text" : "text-zinc-300"
                                }`}
                              >
                                {step.description}
                              </span>
                            </div>

                            <span class="text-[10px] text-zinc-500 font-mono shrink-0">
                              {new Date(step.timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.08] bg-zinc-950/90 shrink-0">
              <div class="text-[10px] text-zinc-400 font-mono">
                Total Duration: <strong class="text-zinc-200">{(replayDurationMs / 1000).toFixed(1)}s</strong>
              </div>
              <button
                onClick={() => {
                  setIsReplayPlaying(false);
                  setIsReplayModalOpen(false);
                }}
                class="px-3.5 py-1.5 rounded-lg text-xs accent-btn-primary font-semibold transition shadow-sm active:scale-95"
              >
                Close Replay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appearance & Accent Theme Settings Modal */}
      {isSettingsModalOpen && (
        <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-hidden animate-fade-in">
          <div class="glass-panel rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-white/[0.12] bg-zinc-950/95 animate-scale-in">
            {/* Modal Header */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-zinc-950/90 shrink-0">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-zinc-800 border border-white/[0.1] flex items-center justify-center text-zinc-300">
                  <PaletteIcon size={13} />
                </div>
                <h3 class="text-xs font-bold text-zinc-100">Accent Color</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                class="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div class="p-3.5 space-y-3 text-xs bg-zinc-950/70">
              {/* Color Grid Choice List */}
              <div class="grid grid-cols-2 gap-2">
                {ACCENT_THEME_OPTIONS.map((theme) => {
                  const isSelected = accentColor === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectAccentColor(theme.id)}
                      class={`px-2.5 py-2 rounded-lg border text-left transition flex items-center justify-between group relative ${
                        isSelected
                          ? "bg-white/[0.08] border-white/[0.25] shadow-glow-sm"
                          : "bg-zinc-900/60 border-white/[0.06] hover:border-white/[0.15] hover:bg-zinc-900/90"
                      }`}
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <span
                          class="w-3.5 h-3.5 rounded-full shadow-sm shrink-0 border border-white/20 transition group-hover:scale-110"
                          style={{
                            background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`
                          }}
                        />
                        <span class={`text-xs font-medium truncate ${isSelected ? "text-white font-semibold" : "text-zinc-300"}`}>
                          {theme.label}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckIcon size={12} class="text-white shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-end px-4 py-2.5 border-t border-white/[0.08] bg-zinc-950/90 shrink-0">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                class="px-4 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Smart Task Architect & Auto-Scheduler Modal */}
      {isSmartSchedulerOpen && parsedTaskDraft && (
        <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-hidden animate-fade-in">
          <div class="glass-panel rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-white/[0.14] bg-zinc-950/95 animate-scale-in">
            {/* Modal Header */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-zinc-950/90 shrink-0">
              <div class="flex items-center gap-2">
                <div
                  class="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${currentThemeStyles.gradientFrom}, ${currentThemeStyles.gradientTo})`
                  }}
                >
                  <SparkleIcon size={14} />
                </div>
                <div>
                  <h3 class="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    AI Task Architect & Schedule
                  </h3>
                  <p class="text-[10px] text-zinc-400">
                    Rough task formatted & structured into an automated schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSmartSchedulerOpen(false)}
                class="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div class="p-4 space-y-3.5 text-xs overflow-y-auto custom-scrollbar flex-1">
              {/* Safety Shield Guard Banner */}
              {parsedTaskDraft.requiresHumanApproval && (
                <div class="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 flex items-start gap-2.5 shadow-sm">
                  <ShieldCheckIcon size={18} class="text-amber-400 shrink-0 mt-0.5" />
                  <div class="space-y-0.5">
                    <div class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      Safety Policy Active: Human Confirmation Required
                    </div>
                    <p class="text-[10px] text-amber-200/90 leading-relaxed">
                      {parsedTaskDraft.safetySummary ||
                        "Sensitive financial/payment actions will not be finalized autonomously. The agent will navigate and prepare everything, then pause and remind you for final approval."}
                    </p>
                  </div>
                </div>
              )}

              {/* Missing Fields / Clarification Needed Banner & Inputs */}
              {parsedTaskDraft.missingFields && parsedTaskDraft.missingFields.length > 0 && (
                <div class="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 text-purple-200 space-y-2.5">
                  <div class="flex items-start gap-2">
                    <InfoIcon size={16} class="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 class="text-[11px] font-bold text-purple-300">Missing Information Needed</h4>
                      <p class="text-[10px] text-purple-200/90 leading-relaxed">
                        {parsedTaskDraft.clarificationPrompt ||
                          "Please provide the following details to ensure accurate automated scheduling and reminders:"}
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {parsedTaskDraft.missingFields.includes("consumerNumber") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Consumer / Account # <span class="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={parsedTaskDraft.consumerNumber || ""}
                          placeholder="e.g. 05001234567"
                          onInput={(e) =>
                            setParsedTaskDraft({
                              ...parsedTaskDraft,
                              consumerNumber: (e.target as HTMLInputElement).value
                            })
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/30 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}

                    {parsedTaskDraft.missingFields.includes("providerName") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Provider / Biller <span class="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={parsedTaskDraft.providerName || ""}
                          placeholder="e.g. CESC, WBSEDCL"
                          onInput={(e) =>
                            setParsedTaskDraft({
                              ...parsedTaskDraft,
                              providerName: (e.target as HTMLInputElement).value
                            })
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/30 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}

                    {parsedTaskDraft.missingFields.includes("dueAmount") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Expected / Max Amount
                        </label>
                        <input
                          type="text"
                          value={parsedTaskDraft.dueAmount || ""}
                          placeholder="e.g. 1450"
                          onInput={(e) =>
                            setParsedTaskDraft({
                              ...parsedTaskDraft,
                              dueAmount: (e.target as HTMLInputElement).value
                            })
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/30 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}

                    {parsedTaskDraft.missingFields.includes("dueDate") && (
                      <div>
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={parsedTaskDraft.dueDate || ""}
                          onInput={(e) =>
                            setParsedTaskDraft({
                              ...parsedTaskDraft,
                              dueDate: (e.target as HTMLInputElement).value
                            })
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/30 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}

                    {parsedTaskDraft.missingFields.includes("targetUrl") && (
                      <div class="sm:col-span-2">
                        <label class="block text-[10px] font-semibold text-purple-200 mb-1">
                          Portal URL (optional)
                        </label>
                        <input
                          type="url"
                          value={parsedTaskDraft.targetUrl || ""}
                          placeholder="https://example.com/payment"
                          onInput={(e) =>
                            setParsedTaskDraft({
                              ...parsedTaskDraft,
                              targetUrl: (e.target as HTMLInputElement).value
                            })
                          }
                          class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-purple-500/30 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Task Title & Category */}
              <div class="space-y-2.5">
                <div>
                  <label class="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={parsedTaskDraft.title}
                    onInput={(e) =>
                      setParsedTaskDraft({
                        ...parsedTaskDraft,
                        title: (e.target as HTMLInputElement).value
                      })
                    }
                    class="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/20"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={parsedTaskDraft.category}
                      onChange={(e) =>
                        setParsedTaskDraft({
                          ...parsedTaskDraft,
                          category: (e.target as HTMLSelectElement).value as TaskCategory
                        })
                      }
                      class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs text-zinc-200 focus:outline-none"
                    >
                      <option value="ELECTRICITY">Electricity</option>
                      <option value="WATER">Water</option>
                      <option value="GAS">Gas</option>
                      <option value="INTERNET">Internet</option>
                      <option value="MOBILE">Mobile</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="SHOPPING">Shopping</option>
                      <option value="COMMERCE_WATCH">Commerce Price Watch</option>
                      <option value="FORM_FILL">Form Fill</option>
                      <option value="GENERAL">General</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={parsedTaskDraft.billingCycle}
                      onChange={(e) =>
                        setParsedTaskDraft({
                          ...parsedTaskDraft,
                          billingCycle: (e.target as HTMLSelectElement).value as BillingCycle
                        })
                      }
                      class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs text-zinc-200 focus:outline-none"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="BI_MONTHLY">Bi-Monthly</option>
                      <option value="YEARLY">Yearly</option>
                      <option value="ONE_OFF">One-Off</option>
                    </select>
                  </div>
                </div>

                {/* Formatted Goal / Execution Instructions */}
                <div>
                  <label class="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Formatted Execution Goal
                  </label>
                  <textarea
                    rows={3}
                    value={parsedTaskDraft.formattedGoal}
                    onInput={(e) =>
                      setParsedTaskDraft({
                        ...parsedTaskDraft,
                        formattedGoal: (e.target as HTMLTextAreaElement).value
                      })
                    }
                    class="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-white/[0.08] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 resize-none"
                  />
                </div>

                {/* Schedule Configuration Card */}
                {parsedTaskDraft.schedule && (
                  <div class="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                        <ClockIcon size={14} class="text-zinc-400" />
                        <span>Schedule Trigger</span>
                      </div>
                      <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300">
                        {parsedTaskDraft.schedule.frequency} • {parsedTaskDraft.schedule.time}
                        {parsedTaskDraft.schedule.dayOfMonth ? ` • Day ${parsedTaskDraft.schedule.dayOfMonth}` : ""}
                      </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span class="text-zinc-400">Frequency:</span>
                        <select
                          value={parsedTaskDraft.schedule.frequency}
                          onChange={(e) =>
                            setParsedTaskDraft({
                              ...parsedTaskDraft,
                              schedule: {
                                ...parsedTaskDraft.schedule!,
                                frequency: (e.target as HTMLSelectElement).value as ScheduleFrequency
                              }
                            })
                          }
                          class="mt-1 w-full px-2 py-1 rounded bg-zinc-800 border border-white/[0.08] text-xs text-zinc-200"
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="DAILY">Daily</option>
                          <option value="ONCE">Once</option>
                        </select>
                      </div>

                      <div>
                        <span class="text-zinc-400">Time:</span>
                        <input
                          type="time"
                          value={parsedTaskDraft.schedule.time}
                          onInput={(e) =>
                            setParsedTaskDraft({
                              ...parsedTaskDraft,
                              schedule: {
                                ...parsedTaskDraft.schedule!,
                                time: (e.target as HTMLInputElement).value
                              }
                            })
                          }
                          class="mt-1 w-full px-2 py-1 rounded bg-zinc-800 border border-white/[0.08] text-xs text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-between px-4 py-3 border-t border-white/[0.08] bg-zinc-950/90 shrink-0">
              <button
                type="button"
                onClick={() => setIsSmartSchedulerOpen(false)}
                class="px-3.5 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition font-medium"
              >
                Cancel
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmSmartScheduledTask(false)}
                  class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800/90 hover:bg-zinc-700 border border-white/[0.12] text-zinc-200 hover:text-white transition shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <FloppyDiskIcon size={13} />
                  <span>Save Task & Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmSmartScheduledTask(true)}
                  class="px-3.5 py-1.5 rounded-lg text-xs font-semibold shimmer-btn text-white transition shadow-md active:scale-95 flex items-center gap-1.5"
                  style={{
                    background: `linear-gradient(135deg, ${currentThemeStyles.gradientFrom}, ${currentThemeStyles.gradientTo})`
                  }}
                >
                  <PlayIcon size={13} />
                  <span>Save & Run Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


