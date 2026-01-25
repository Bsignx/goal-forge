"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
  Battery,
  BatteryLow,
  BatteryWarning,
  Radio,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Settings,
  Palmtree,
  Moon,
} from "lucide-react";
import Link from "next/link";

// Types
type LoadMode = "FULL" | "RECOVERY" | "MINIMAL";
type HabitFrequency =
  | "DAILY"
  | "WEEKDAYS"
  | "WEEKENDS"
  | "SPECIFIC_DAYS"
  | "X_PER_WEEK";

type Identity = {
  id: string;
  name: string;
  emoji: string;
};

type Habit = {
  id: string;
  name: string;
  emoji: string;
  order: number;
  completed: boolean;
  completionMode: LoadMode | null;
  identityId: string | null;
  identity: Identity | null;
  fullDescription: string | null;
  recoveryDescription: string | null;
  minimalDescription: string | null;
  frequency: HabitFrequency;
  scheduledDays: number[];
  targetPerWeek: number | null;
  completionsThisWeek?: number;
  isScheduledToday?: boolean;
};

type EditingHabit = {
  id: string;
  name: string;
  emoji: string;
  identityId: string | null;
  fullDescription: string;
  recoveryDescription: string;
  minimalDescription: string;
  frequency: HabitFrequency;
  scheduledDays: number[];
  targetPerWeek: number | null;
} | null;

type EditingIdentity = {
  id: string;
  name: string;
  emoji: string;
} | null;

type Task = {
  id: string;
  name: string;
  emoji: string;
  order: number;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  identityId: string | null;
  identity: Identity | null;
};

type EditingTask = {
  id: string;
  name: string;
  emoji: string;
  identityId: string | null;
  dueDate: string;
} | null;

// Unified item type for the Today list
type TodayItem = { type: "habit"; data: Habit } | { type: "task"; data: Task };

// User Settings type
type UserSettings = {
  id: string;
  restDays: number[];
  vacationMode: boolean;
  vacationStart: string | null;
  vacationEnd: string | null;
};

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayMode, setDayMode] = useState<LoadMode>("FULL");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });

  // Dialogs
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddIdentity, setShowAddIdentity] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingHabit, setEditingHabit] = useState<EditingHabit>(null);
  const [editingIdentity, setEditingIdentity] = useState<EditingIdentity>(null);
  const [editingTask, setEditingTask] = useState<EditingTask>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "habit" | "identity" | "task";
    id: string;
  } | null>(null);

  // User Settings state
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [tempRestDays, setTempRestDays] = useState<number[]>([]);
  const [tempVacationMode, setTempVacationMode] = useState(false);
  const [tempVacationStart, setTempVacationStart] = useState("");
  const [tempVacationEnd, setTempVacationEnd] = useState("");

  // Stoic Writing state
  const [stoicQuestion, setStoicQuestion] = useState("");
  const [stoicAnswer, setStoicAnswer] = useState("");
  const [stoicEntry, setStoicEntry] = useState<{
    id: string;
    answer: string;
  } | null>(null);
  const [stoicQuote, setStoicQuote] = useState<{
    text: string;
    author: string;
  } | null>(null);
  const [savingStoic, setSavingStoic] = useState(false);

  // Weekly execution score state
  const [weeklyScore, setWeeklyScore] = useState<{
    score: number;
    totalPossible: number;
    totalCompleted: number;
    daysElapsed: number;
  } | null>(null);

  // Form state
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✅");
  const [newHabitIdentityId, setNewHabitIdentityId] = useState<string>("");
  const [newHabitFull, setNewHabitFull] = useState("");
  const [newHabitRecovery, setNewHabitRecovery] = useState("");
  const [newHabitMinimal, setNewHabitMinimal] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] =
    useState<HabitFrequency>("DAILY");
  const [newHabitScheduledDays, setNewHabitScheduledDays] = useState<number[]>(
    [],
  );
  const [newHabitTargetPerWeek, setNewHabitTargetPerWeek] = useState<number>(3);
  const [newIdentityName, setNewIdentityName] = useState("");
  const [newIdentityEmoji, setNewIdentityEmoji] = useState("🎯");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskEmoji, setNewTaskEmoji] = useState("⚡");
  const [newTaskIdentityId, setNewTaskIdentityId] = useState<string>("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Helper to format date as YYYY-MM-DD
  const formatDateParam = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Check if selected date is today
  const isToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return selectedDate.getTime() === now.getTime();
  }, [selectedDate]);

  // Fetch functions
  const fetchHabits = useCallback(async (date: Date) => {
    try {
      const dateParam = formatDateParam(date);
      const res = await fetch(`/api/habits/today?date=${dateParam}`);
      if (res.ok) {
        const data = await res.json();
        setHabits(data);
      }
    } catch (error) {
      console.error("Failed to fetch habits:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIdentities = useCallback(async () => {
    try {
      const res = await fetch("/api/identities");
      if (res.ok) {
        const data = await res.json();
        setIdentities(data);
      }
    } catch (error) {
      console.error("Failed to fetch identities:", error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  }, []);

  const fetchStoicEntry = useCallback(async () => {
    try {
      const res = await fetch("/api/stoic");
      if (res.ok) {
        const data = await res.json();
        setStoicQuestion(data.question);
        if (data.quote) {
          setStoicQuote(data.quote);
        }
        if (data.entry) {
          setStoicEntry(data.entry);
          setStoicAnswer(data.entry.answer);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stoic entry:", error);
    }
  }, []);

  const fetchWeeklyScore = useCallback(async () => {
    try {
      const res = await fetch("/api/habits/score");
      if (res.ok) {
        const data = await res.json();
        setWeeklyScore({
          score: data.weeklyScore,
          totalPossible: data.totalPossible,
          totalCompleted: data.totalCompleted,
          daysElapsed: data.daysElapsed,
        });
      }
    } catch (error) {
      console.error("Failed to fetch weekly score:", error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, []);

  // Effects
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchHabits(selectedDate);
      fetchIdentities();
      fetchTasks();
      fetchStoicEntry();
      fetchWeeklyScore();
      fetchSettings();
    }
  }, [
    session,
    selectedDate,
    fetchHabits,
    fetchIdentities,
    fetchTasks,
    fetchStoicEntry,
    fetchWeeklyScore,
    fetchSettings,
  ]);

  // Date navigation helpers
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Don't allow going to future dates
    if (selectedDate >= now) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setSelectedDate(now);
  };

  // Check if a date is a rest day or in vacation
  const isRestDay = useCallback(
    (date: Date) => {
      if (!userSettings) return false;
      const dayOfWeek = date.getDay();
      return userSettings.restDays.includes(dayOfWeek);
    },
    [userSettings],
  );

  const isOnVacation = useCallback(
    (date: Date) => {
      if (!userSettings || !userSettings.vacationMode) return false;
      if (!userSettings.vacationStart || !userSettings.vacationEnd) return false;

      const start = new Date(userSettings.vacationStart);
      const end = new Date(userSettings.vacationEnd);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return date >= start && date <= end;
    },
    [userSettings],
  );

  // Handlers
  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const openSettingsDialog = () => {
    if (userSettings) {
      setTempRestDays(userSettings.restDays);
      setTempVacationMode(userSettings.vacationMode);
      setTempVacationStart(userSettings.vacationStart?.split("T")[0] || "");
      setTempVacationEnd(userSettings.vacationEnd?.split("T")[0] || "");
    }
    setShowSettings(true);
  };

  const saveSettings = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restDays: tempRestDays,
          vacationMode: tempVacationMode,
          vacationStart: tempVacationStart || null,
          vacationEnd: tempVacationEnd || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserSettings(data);
        setShowSettings(false);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const saveStoicEntry = async () => {
    if (!stoicAnswer.trim() || stoicAnswer.length > 300) return;

    setSavingStoic(true);
    try {
      const res = await fetch("/api/stoic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: stoicAnswer }),
      });
      if (res.ok) {
        const entry = await res.json();
        setStoicEntry(entry);
      }
    } catch (error) {
      console.error("Failed to save stoic entry:", error);
    } finally {
      setSavingStoic(false);
    }
  };

  const toggleHabit = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const wasCompleted = habit.completed;
    const previousMode = habit.completionMode;

    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              completed: !h.completed,
              completionMode: !h.completed ? dayMode : null,
            }
          : h,
      ),
    );

    try {
      const dateParam = formatDateParam(selectedDate);
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: dayMode, date: dateParam }),
      });
      if (!res.ok) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  completed: wasCompleted,
                  completionMode: previousMode,
                }
              : h,
          ),
        );
      } else {
        // Refresh weekly score after successful toggle
        fetchWeeklyScore();
      }
    } catch {
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? { ...h, completed: !h.completed } : h,
        ),
      );
    }
  };

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    // Create optimistic habit with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticHabit: Habit = {
      id: tempId,
      name: newHabitName,
      emoji: newHabitEmoji,
      order: habits.length,
      completed: false,
      completionMode: null,
      identityId: newHabitIdentityId || null,
      identity: newHabitIdentityId
        ? identities.find((i) => i.id === newHabitIdentityId) || null
        : null,
      fullDescription: newHabitFull || null,
      recoveryDescription: newHabitRecovery || null,
      minimalDescription: newHabitMinimal || null,
      frequency: newHabitFrequency,
      scheduledDays: newHabitScheduledDays,
      targetPerWeek:
        newHabitFrequency === "X_PER_WEEK" ? newHabitTargetPerWeek : null,
      isScheduledToday: true,
    };

    // Optimistically add to list
    setHabits((prev) => [...prev, optimisticHabit]);

    // Close dialog and reset form immediately
    setShowAddHabit(false);
    setNewHabitName("");
    setNewHabitEmoji("✅");
    setNewHabitIdentityId("");
    setNewHabitFull("");
    setNewHabitRecovery("");
    setNewHabitMinimal("");
    setNewHabitFrequency("DAILY");
    setNewHabitScheduledDays([]);
    setNewHabitTargetPerWeek(3);

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: optimisticHabit.name,
          emoji: optimisticHabit.emoji,
          identityId: optimisticHabit.identityId,
          fullDescription: optimisticHabit.fullDescription,
          recoveryDescription: optimisticHabit.recoveryDescription,
          minimalDescription: optimisticHabit.minimalDescription,
          frequency: optimisticHabit.frequency,
          scheduledDays: optimisticHabit.scheduledDays,
          targetPerWeek: optimisticHabit.targetPerWeek,
        }),
      });
      if (res.ok) {
        const newHabit = await res.json();
        // Replace temp habit with real one
        setHabits((prev) =>
          prev.map((h) =>
            h.id === tempId
              ? { ...newHabit, completed: false, completionMode: null }
              : h,
          ),
        );
      } else {
        // Revert on failure
        setHabits((prev) => prev.filter((h) => h.id !== tempId));
      }
    } catch (error) {
      console.error("Failed to add habit:", error);
      // Revert on error
      setHabits((prev) => prev.filter((h) => h.id !== tempId));
    }
  };

  const addIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentityName.trim()) return;

    // Create optimistic identity with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticIdentity: Identity = {
      id: tempId,
      name: newIdentityName,
      emoji: newIdentityEmoji,
    };

    // Optimistically add to list
    setIdentities((prev) => [...prev, optimisticIdentity]);

    // Close dialog and reset form immediately
    setShowAddIdentity(false);
    setNewIdentityName("");
    setNewIdentityEmoji("🎯");

    try {
      const res = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: optimisticIdentity.name,
          emoji: optimisticIdentity.emoji,
        }),
      });
      if (res.ok) {
        const newIdentity = await res.json();
        // Replace temp identity with real one
        setIdentities((prev) =>
          prev.map((i) => (i.id === tempId ? newIdentity : i)),
        );
      } else {
        // Revert on failure
        setIdentities((prev) => prev.filter((i) => i.id !== tempId));
      }
    } catch (error) {
      console.error("Failed to add identity:", error);
      // Revert on error
      setIdentities((prev) => prev.filter((i) => i.id !== tempId));
    }
  };

  // Task handlers
  const toggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const wasCompleted = task.completed;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null,
            }
          : t,
      ),
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, completed: wasCompleted, completedAt: task.completedAt }
              : t,
          ),
        );
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t,
        ),
      );
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    // Create optimistic task with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      name: newTaskName,
      emoji: newTaskEmoji,
      order: tasks.length,
      dueDate: newTaskDueDate || null,
      completed: false,
      completedAt: null,
      identityId: newTaskIdentityId || null,
      identity: newTaskIdentityId
        ? identities.find((i) => i.id === newTaskIdentityId) || null
        : null,
    };

    // Optimistically add to list
    setTasks((prev) => [...prev, optimisticTask]);

    // Close dialog and reset form immediately
    setShowAddTask(false);
    setNewTaskName("");
    setNewTaskEmoji("⚡");
    setNewTaskIdentityId("");
    setNewTaskDueDate("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: optimisticTask.name,
          emoji: optimisticTask.emoji,
          identityId: optimisticTask.identityId,
          dueDate: optimisticTask.dueDate,
        }),
      });
      if (res.ok) {
        const newTask = await res.json();
        // Replace temp task with real one
        setTasks((prev) => prev.map((t) => (t.id === tempId ? newTask : t)));
      } else {
        // Revert on failure
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    } catch (error) {
      console.error("Failed to add task:", error);
      // Revert on error
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  const updateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.name.trim()) return;

    // Store previous state for rollback
    const previousTasks = [...tasks];
    const taskId = editingTask.id;

    // Optimistically update the task
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              name: editingTask.name,
              emoji: editingTask.emoji,
              identityId: editingTask.identityId,
              identity: editingTask.identityId
                ? identities.find((i) => i.id === editingTask.identityId) ||
                  null
                : null,
              dueDate: editingTask.dueDate || null,
            }
          : t,
      ),
    );

    // Close dialog immediately
    setEditingTask(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingTask.name,
          emoji: editingTask.emoji,
          identityId: editingTask.identityId,
          dueDate: editingTask.dueDate || null,
        }),
      });
      if (!res.ok) {
        // Revert on failure
        setTasks(previousTasks);
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      // Revert on error
      setTasks(previousTasks);
    }
  };

  const updateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit || !editingHabit.name.trim()) return;

    // Store previous state for rollback
    const previousHabits = [...habits];
    const habitId = editingHabit.id;

    // Optimistically update the habit
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              name: editingHabit.name,
              emoji: editingHabit.emoji,
              identityId: editingHabit.identityId,
              identity: editingHabit.identityId
                ? identities.find((i) => i.id === editingHabit.identityId) ||
                  null
                : null,
              fullDescription: editingHabit.fullDescription || null,
              recoveryDescription: editingHabit.recoveryDescription || null,
              minimalDescription: editingHabit.minimalDescription || null,
              frequency: editingHabit.frequency,
              scheduledDays: editingHabit.scheduledDays,
              targetPerWeek:
                editingHabit.frequency === "X_PER_WEEK"
                  ? editingHabit.targetPerWeek
                  : null,
            }
          : h,
      ),
    );

    // Close dialog immediately
    setEditingHabit(null);

    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingHabit.name,
          emoji: editingHabit.emoji,
          identityId: editingHabit.identityId,
          fullDescription: editingHabit.fullDescription || null,
          recoveryDescription: editingHabit.recoveryDescription || null,
          minimalDescription: editingHabit.minimalDescription || null,
          frequency: editingHabit.frequency,
          scheduledDays: editingHabit.scheduledDays,
          targetPerWeek:
            editingHabit.frequency === "X_PER_WEEK"
              ? editingHabit.targetPerWeek
              : null,
        }),
      });
      if (!res.ok) {
        // Revert on failure
        setHabits(previousHabits);
      }
    } catch (error) {
      console.error("Failed to update habit:", error);
      // Revert on error
      setHabits(previousHabits);
    }
  };

  const updateIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdentity || !editingIdentity.name.trim()) return;

    // Store previous state for rollback
    const previousIdentities = [...identities];
    const identityId = editingIdentity.id;

    // Optimistically update the identity
    setIdentities((prev) =>
      prev.map((i) =>
        i.id === identityId
          ? { ...i, name: editingIdentity.name, emoji: editingIdentity.emoji }
          : i,
      ),
    );

    // Also update habits that reference this identity
    setHabits((prev) =>
      prev.map((h) =>
        h.identityId === identityId
          ? {
              ...h,
              identity: {
                id: identityId,
                name: editingIdentity.name,
                emoji: editingIdentity.emoji,
              },
            }
          : h,
      ),
    );

    // Close dialog immediately
    setEditingIdentity(null);

    try {
      const res = await fetch(`/api/identities/${identityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingIdentity.name,
          emoji: editingIdentity.emoji,
        }),
      });
      if (!res.ok) {
        // Revert on failure
        setIdentities(previousIdentities);
        fetchHabits(selectedDate); // Refresh habits to get correct identity data
      }
    } catch (error) {
      console.error("Failed to update identity:", error);
      // Revert on error
      setIdentities(previousIdentities);
      fetchHabits(selectedDate);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    // Store previous state for rollback
    const previousHabits = [...habits];
    const previousIdentities = [...identities];
    const previousTasks = [...tasks];

    // Optimistically remove the item
    if (deleteConfirm.type === "habit") {
      setHabits((prev) => prev.filter((h) => h.id !== deleteConfirm.id));
    } else if (deleteConfirm.type === "task") {
      setTasks((prev) => prev.filter((t) => t.id !== deleteConfirm.id));
    } else {
      setIdentities((prev) => prev.filter((i) => i.id !== deleteConfirm.id));
      // Also clear identity reference from habits and tasks
      setHabits((prev) =>
        prev.map((h) =>
          h.identityId === deleteConfirm.id
            ? { ...h, identityId: null, identity: null }
            : h,
        ),
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.identityId === deleteConfirm.id
            ? { ...t, identityId: null, identity: null }
            : t,
        ),
      );
    }

    // Close dialog immediately
    setDeleteConfirm(null);

    try {
      let endpoint: string;
      if (deleteConfirm.type === "habit") {
        endpoint = `/api/habits/${deleteConfirm.id}`;
      } else if (deleteConfirm.type === "task") {
        endpoint = `/api/tasks/${deleteConfirm.id}`;
      } else {
        endpoint = `/api/identities/${deleteConfirm.id}`;
      }

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        // Revert on failure
        setHabits(previousHabits);
        setIdentities(previousIdentities);
        setTasks(previousTasks);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      // Revert on error
      setHabits(previousHabits);
      setIdentities(previousIdentities);
      setTasks(previousTasks);
    }
  };

  // Computed values
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isViewingToday = selectedDate.getTime() === today.getTime();
  const isViewingPast = selectedDate < today;
  const selectedDateIsRestDay = isRestDay(selectedDate);
  const selectedDateIsVacation = isOnVacation(selectedDate);
  const isBreakDay = selectedDateIsRestDay || selectedDateIsVacation;

  const formattedSelectedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Combine habits and tasks for unified progress
  const completedHabits = habits.filter((h) => h.completed).length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completedCount = completedHabits + completedTasks;
  const totalCount = habits.length + tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Create unified today items list
  const todayItems: TodayItem[] = [
    ...habits.map((h) => ({ type: "habit" as const, data: h })),
    ...tasks.map((t) => ({ type: "task" as const, data: t })),
  ];

  // Loading state with skeletons
  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <header className="border-b">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          {/* Daily Header Skeleton */}
          <div className="mb-8 text-center">
            <Skeleton className="h-4 w-24 mx-auto mb-2" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>

          {/* Energy Level Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>

          {/* Activities Hero Section Skeleton */}
          <Card className="mb-8 border-2 border-primary/20 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-6 w-40 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-9 w-16" />
              </div>
              <Skeleton className="h-3 w-full mb-6" />
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>

          {/* Weekly Score Skeleton */}
          <div className="mb-8">
            <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-9 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Stoic Quote Skeleton */}
          <div className="mb-8">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stoic Reflection Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-4 w-32 mb-3" />
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Identities Skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-14" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-32 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
              <Skeleton className="h-10 w-36 rounded-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🎯 Goal Forge</h1>
          <div className="flex items-center gap-2">
            <Link href="/radar">
              <Button variant="outline" size="sm">
                <Radio className="w-4 h-4 mr-1" />
                Radar
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openSettingsDialog}
            >
              <Settings className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {session.user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Daily Header with Date Navigation */}
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            {isViewingToday ? "Daily Panel" : "Past Day View"}
          </p>

          {/* Date Navigation */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousDay}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <h2 className="text-xl sm:text-2xl font-bold capitalize min-w-48">
              {formattedSelectedDate}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextDay}
              disabled={isViewingToday}
              className="h-8 w-8"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Rest Day / Vacation Indicator */}
          {isBreakDay && (
            <div className="mt-2 flex items-center justify-center gap-2">
              {selectedDateIsVacation && (
                <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
                  <Palmtree className="w-3 h-3 mr-1" />
                  Vacation Mode
                </Badge>
              )}
              {selectedDateIsRestDay && !selectedDateIsVacation && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  <Moon className="w-3 h-3 mr-1" />
                  Rest Day
                </Badge>
              )}
            </div>
          )}

          {/* Today button when viewing past */}
          {isViewingPast && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="mt-2"
            >
              Back to Today
            </Button>
          )}

          <p className="text-muted-foreground text-sm mt-2">
            {isBreakDay 
              ? (selectedDateIsVacation 
                  ? "Taking a well-deserved break. Habits are paused." 
                  : "Scheduled rest day. Recharge your batteries!")
              : (isViewingToday
                  ? "Just today. Nothing from yesterday. Nothing from tomorrow."
                  : "Viewing a past day. You can edit completions here.")}
          </p>
        </div>

        {/* Load Mode Selector (Anti-Burnout) */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Battery className="w-4 h-4" />
            Energy Level
          </p>
          <div className="flex gap-2">
            <Button
              variant={dayMode === "FULL" ? "default" : "outline"}
              className={`flex-1 ${dayMode === "FULL" ? "bg-green-600 hover:bg-green-700" : ""}`}
              onClick={() => setDayMode("FULL")}
            >
              <Battery className="w-4 h-4 mr-2" />
              Full
            </Button>
            <Button
              variant={dayMode === "RECOVERY" ? "default" : "outline"}
              className={`flex-1 ${dayMode === "RECOVERY" ? "bg-yellow-600 hover:bg-yellow-700" : ""}`}
              onClick={() => setDayMode("RECOVERY")}
            >
              <BatteryWarning className="w-4 h-4 mr-2" />
              Recovery
            </Button>
            <Button
              variant={dayMode === "MINIMAL" ? "default" : "outline"}
              className={`flex-1 ${dayMode === "MINIMAL" ? "bg-red-600 hover:bg-red-700" : ""}`}
              onClick={() => setDayMode("MINIMAL")}
            >
              <BatteryLow className="w-4 h-4 mr-2" />
              Minimal
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {dayMode === "FULL" && "Normal day - Full energy 💪"}
            {dayMode === "RECOVERY" && "Tired or sick - Take it easy 🌙"}
            {dayMode === "MINIMAL" && "Bad day - Just show up 🌱"}
          </p>
        </div>

        {/* ===== TODAY'S ACTIVITIES - HERO SECTION ===== */}
        <Card className="mb-8 border-2 border-primary/20 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            {/* Section Header with Progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">⚡</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    Today&apos;s Activities
                  </h3>
                  {totalCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {completedCount}/{totalCount} completed
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddTask(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Task</span>
                  <span className="sm:hidden">One-time</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddHabit(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Habit</span>
                  <span className="sm:hidden">Recurring</span>
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
              <div className="mb-6">
                <Progress value={progress} className="h-3" />
              </div>
            )}

            {/* Activities List */}
            <div className="space-y-4">
              {/* Items grouped by identity */}
              {identities.map((identity) => {
                const identityHabits = habits.filter(
                  (h) => h.identityId === identity.id,
                );
                const identityTasks = tasks.filter(
                  (t) => t.identityId === identity.id,
                );
                if (identityHabits.length === 0 && identityTasks.length === 0)
                  return null;

                return (
                  <div key={identity.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{identity.emoji}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {identity.name}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {identityHabits.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          dayMode={dayMode}
                          onToggle={toggleHabit}
                          onEdit={(h) =>
                            setEditingHabit({
                              ...h,
                              identityId: h.identityId,
                              fullDescription: h.fullDescription || "",
                              recoveryDescription: h.recoveryDescription || "",
                              minimalDescription: h.minimalDescription || "",
                              frequency: h.frequency || "DAILY",
                              scheduledDays: h.scheduledDays || [],
                              targetPerWeek: h.targetPerWeek || null,
                            })
                          }
                          onDelete={(id) =>
                            setDeleteConfirm({ type: "habit", id })
                          }
                        />
                      ))}
                      {identityTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggle={toggleTask}
                          onEdit={(t) =>
                            setEditingTask({
                              id: t.id,
                              name: t.name,
                              emoji: t.emoji,
                              identityId: t.identityId,
                              dueDate: t.dueDate || "",
                            })
                          }
                          onDelete={(id) =>
                            setDeleteConfirm({ type: "task", id })
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Items without identity */}
              {(habits.filter((h) => !h.identityId).length > 0 ||
                tasks.filter((t) => !t.identityId).length > 0) && (
                <div>
                  {identities.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📋</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        General Activities
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {habits
                      .filter((h) => !h.identityId)
                      .map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          dayMode={dayMode}
                          onToggle={toggleHabit}
                          onEdit={(h) =>
                            setEditingHabit({
                              ...h,
                              identityId: h.identityId,
                              fullDescription: h.fullDescription || "",
                              recoveryDescription: h.recoveryDescription || "",
                              minimalDescription: h.minimalDescription || "",
                              frequency: h.frequency || "DAILY",
                              scheduledDays: h.scheduledDays || [],
                              targetPerWeek: h.targetPerWeek || null,
                            })
                          }
                          onDelete={(id) =>
                            setDeleteConfirm({ type: "habit", id })
                          }
                        />
                      ))}
                    {tasks
                      .filter((t) => !t.identityId)
                      .map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggle={toggleTask}
                          onEdit={(t) =>
                            setEditingTask({
                              id: t.id,
                              name: t.name,
                              emoji: t.emoji,
                              identityId: t.identityId,
                              dueDate: t.dueDate || "",
                            })
                          }
                          onDelete={(id) =>
                            setDeleteConfirm({ type: "task", id })
                          }
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {habits.length === 0 && tasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <span className="text-4xl block mb-3">🎯</span>
                  <p className="mb-2">No activities for today yet.</p>
                  <p className="text-sm">
                    Add a habit (recurring) or task (one-time) to get started!
                  </p>
                </div>
              )}
            </div>

            {/* Celebration */}
            {completedCount === totalCount && totalCount > 0 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <span className="text-3xl">🎉</span>
                <p className="mt-1 text-green-700 dark:text-green-400 font-medium text-sm">
                  All done! Amazing work today!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Execution Score */}
        {weeklyScore && weeklyScore.totalPossible > 0 && (
          <div className="mb-8">
            <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                        Weekly Execution
                      </p>
                      <p className="text-xs text-violet-600 dark:text-violet-300">
                        Day {weeklyScore.daysElapsed} of 7
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-violet-900 dark:text-violet-100">
                      {weeklyScore.score}%
                    </p>
                    <p className="text-xs text-violet-600 dark:text-violet-300">
                      {weeklyScore.totalCompleted}/{weeklyScore.totalPossible}{" "}
                      completed
                    </p>
                  </div>
                </div>
                <Progress
                  value={weeklyScore.score}
                  className="h-2 bg-violet-200 dark:bg-violet-800"
                />
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 text-center italic">
                  Streaks break people. Percentages educate.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stoic Quote of the Day */}
        {stoicQuote && (
          <div className="mb-8">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📜</span>
                  <div className="flex-1">
                    <p className="text-lg italic text-amber-900 dark:text-amber-100 leading-relaxed">
                      &ldquo;{stoicQuote.text}&rdquo;
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 font-medium">
                      — {stoicQuote.author}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stoic Writing Section */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            Stoic Reflection
          </p>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-base font-medium">{stoicQuestion}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Short and objective answer (max 300 characters)
                </p>
              </div>
              <div className="space-y-2">
                <Textarea
                  value={stoicAnswer}
                  onChange={(e) => {
                    if (e.target.value.length <= 300) {
                      setStoicAnswer(e.target.value);
                    }
                  }}
                  placeholder="Write your reflection..."
                  className="min-h-24 resize-none"
                  maxLength={300}
                />
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs ${stoicAnswer.length > 280 ? "text-orange-500" : "text-muted-foreground"}`}
                  >
                    {stoicAnswer.length}/300
                  </span>
                  <Button
                    onClick={saveStoicEntry}
                    disabled={!stoicAnswer.trim() || savingStoic}
                    size="sm"
                  >
                    {savingStoic ? "Saving..." : stoicEntry ? "Update" : "Save"}
                  </Button>
                </div>
              </div>
              {stoicEntry && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Reflection saved
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Identities Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Today I act as
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddIdentity(true)}
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {identities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {identities.map((identity) => (
                <Badge
                  key={identity.id}
                  variant="secondary"
                  className="px-4 py-2 text-base gap-2 cursor-pointer hover:bg-secondary/80 group"
                  onClick={() => setEditingIdentity(identity)}
                >
                  <span>{identity.emoji}</span>
                  <span>{identity.name}</span>
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Badge>
              ))}
            </div>
          ) : (
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors border-dashed"
              onClick={() => setShowAddIdentity(true)}
            >
              <CardContent className="py-4 text-center text-muted-foreground">
                <span className="text-lg mr-2">🎭</span>
                Define your identity: &quot;Today I act as...&quot;
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Add Habit Dialog */}
      <Dialog open={showAddHabit} onOpenChange={setShowAddHabit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Create a new daily activity to track.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addHabit} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20 space-y-1.5">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={newHabitEmoji}
                  onChange={(e) => setNewHabitEmoji(e.target.value)}
                  className="text-center text-xl"
                  placeholder="✅"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="Activity name..."
                  autoFocus
                />
              </div>
            </div>
            {identities.length > 0 && (
              <div className="space-y-1.5">
                <Label>Link to Identity (optional)</Label>
                <Select
                  value={newHabitIdentityId || "none"}
                  onValueChange={(value) =>
                    setNewHabitIdentityId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No identity (General)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No identity (General)</SelectItem>
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>
                        {identity.emoji} {identity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Frequency Selection */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-2">
                📅 Frequency
              </p>
              <Select
                value={newHabitFrequency}
                onValueChange={(value: HabitFrequency) => {
                  setNewHabitFrequency(value);
                  if (value === "WEEKDAYS") {
                    setNewHabitScheduledDays([1, 2, 3, 4, 5]);
                  } else if (value === "WEEKENDS") {
                    setNewHabitScheduledDays([0, 6]);
                  } else if (value !== "SPECIFIC_DAYS") {
                    setNewHabitScheduledDays([]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Every day</SelectItem>
                  <SelectItem value="WEEKDAYS">Weekdays (Mon-Fri)</SelectItem>
                  <SelectItem value="WEEKENDS">Weekends (Sat-Sun)</SelectItem>
                  <SelectItem value="SPECIFIC_DAYS">Specific days</SelectItem>
                  <SelectItem value="X_PER_WEEK">X times per week</SelectItem>
                </SelectContent>
              </Select>

              {newHabitFrequency === "SPECIFIC_DAYS" && (
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, index) => (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={
                          newHabitScheduledDays.includes(index)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          if (newHabitScheduledDays.includes(index)) {
                            setNewHabitScheduledDays(
                              newHabitScheduledDays.filter((d) => d !== index),
                            );
                          } else {
                            setNewHabitScheduledDays(
                              [...newHabitScheduledDays, index].sort(),
                            );
                          }
                        }}
                      >
                        {day}
                      </Button>
                    ),
                  )}
                </div>
              )}

              {newHabitFrequency === "X_PER_WEEK" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={newHabitTargetPerWeek}
                    onChange={(e) =>
                      setNewHabitTargetPerWeek(parseInt(e.target.value) || 1)
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">
                    times per week
                  </span>
                </div>
              )}
            </div>

            {/* Load System (Anti-Burnout) */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Battery className="w-4 h-4" />
                Load Levels (optional)
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="full" className="text-xs text-green-600">
                  🔴 Full (normal day)
                </Label>
                <Input
                  id="full"
                  value={newHabitFull}
                  onChange={(e) => setNewHabitFull(e.target.value)}
                  placeholder="e.g., 45 min workout"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recovery" className="text-xs text-yellow-600">
                  🟡 Recovery (tired/sick)
                </Label>
                <Input
                  id="recovery"
                  value={newHabitRecovery}
                  onChange={(e) => setNewHabitRecovery(e.target.value)}
                  placeholder="e.g., 20 min light exercise"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minimal" className="text-xs text-red-600">
                  🟢 Minimal (bad day)
                </Label>
                <Input
                  id="minimal"
                  value={newHabitMinimal}
                  onChange={(e) => setNewHabitMinimal(e.target.value)}
                  placeholder="e.g., 5 push-ups"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddHabit(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Habit Dialog */}
      <Dialog
        open={!!editingHabit}
        onOpenChange={(open) => !open && setEditingHabit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateHabit} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20 space-y-1.5">
                <Label htmlFor="edit-emoji">Emoji</Label>
                <Input
                  id="edit-emoji"
                  value={editingHabit?.emoji || ""}
                  onChange={(e) =>
                    setEditingHabit((prev) =>
                      prev ? { ...prev, emoji: e.target.value } : null,
                    )
                  }
                  className="text-center text-xl"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingHabit?.name || ""}
                  onChange={(e) =>
                    setEditingHabit((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    )
                  }
                  autoFocus
                />
              </div>
            </div>
            {identities.length > 0 && (
              <div className="space-y-1.5">
                <Label>Link to Identity</Label>
                <Select
                  value={editingHabit?.identityId || "none"}
                  onValueChange={(value) =>
                    setEditingHabit((prev) =>
                      prev
                        ? {
                            ...prev,
                            identityId: value === "none" ? null : value,
                          }
                        : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No identity (General)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No identity (General)</SelectItem>
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>
                        {identity.emoji} {identity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Frequency Selection */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-2">
                📅 Frequency
              </p>
              <Select
                value={editingHabit?.frequency || "DAILY"}
                onValueChange={(value: HabitFrequency) => {
                  setEditingHabit((prev) => {
                    if (!prev) return null;
                    let scheduledDays = prev.scheduledDays;
                    if (value === "WEEKDAYS") {
                      scheduledDays = [1, 2, 3, 4, 5];
                    } else if (value === "WEEKENDS") {
                      scheduledDays = [0, 6];
                    } else if (value !== "SPECIFIC_DAYS") {
                      scheduledDays = [];
                    }
                    return { ...prev, frequency: value, scheduledDays };
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Every day</SelectItem>
                  <SelectItem value="WEEKDAYS">Weekdays (Mon-Fri)</SelectItem>
                  <SelectItem value="WEEKENDS">Weekends (Sat-Sun)</SelectItem>
                  <SelectItem value="SPECIFIC_DAYS">Specific days</SelectItem>
                  <SelectItem value="X_PER_WEEK">X times per week</SelectItem>
                </SelectContent>
              </Select>

              {editingHabit?.frequency === "SPECIFIC_DAYS" && (
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, index) => (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={
                          (editingHabit?.scheduledDays || []).includes(index)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          setEditingHabit((prev) => {
                            if (!prev) return null;
                            const current = prev.scheduledDays || [];
                            if (current.includes(index)) {
                              return {
                                ...prev,
                                scheduledDays: current.filter(
                                  (d) => d !== index,
                                ),
                              };
                            } else {
                              return {
                                ...prev,
                                scheduledDays: [...current, index].sort(),
                              };
                            }
                          });
                        }}
                      >
                        {day}
                      </Button>
                    ),
                  )}
                </div>
              )}

              {editingHabit?.frequency === "X_PER_WEEK" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={editingHabit?.targetPerWeek || 3}
                    onChange={(e) =>
                      setEditingHabit((prev) =>
                        prev
                          ? {
                              ...prev,
                              targetPerWeek: parseInt(e.target.value) || 1,
                            }
                          : null,
                      )
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">
                    times per week
                  </span>
                </div>
              )}
            </div>

            {/* Load System (Anti-Burnout) */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Battery className="w-4 h-4" />
                Load Levels
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="edit-full" className="text-xs text-green-600">
                  🔴 Full (normal day)
                </Label>
                <Input
                  id="edit-full"
                  value={editingHabit?.fullDescription || ""}
                  onChange={(e) =>
                    setEditingHabit((prev) =>
                      prev
                        ? { ...prev, fullDescription: e.target.value }
                        : null,
                    )
                  }
                  placeholder="e.g., 45 min workout"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-recovery"
                  className="text-xs text-yellow-600"
                >
                  🟡 Recovery (tired/sick)
                </Label>
                <Input
                  id="edit-recovery"
                  value={editingHabit?.recoveryDescription || ""}
                  onChange={(e) =>
                    setEditingHabit((prev) =>
                      prev
                        ? { ...prev, recoveryDescription: e.target.value }
                        : null,
                    )
                  }
                  placeholder="e.g., 20 min light exercise"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-minimal" className="text-xs text-red-600">
                  🟢 Minimal (bad day)
                </Label>
                <Input
                  id="edit-minimal"
                  value={editingHabit?.minimalDescription || ""}
                  onChange={(e) =>
                    setEditingHabit((prev) =>
                      prev
                        ? { ...prev, minimalDescription: e.target.value }
                        : null,
                    )
                  }
                  placeholder="e.g., 5 push-ups"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingHabit(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Identity Dialog */}
      <Dialog open={showAddIdentity} onOpenChange={setShowAddIdentity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Identity</DialogTitle>
            <DialogDescription>
              Who do you want to be? Identity shapes behavior.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addIdentity} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20 space-y-1.5">
                <Label htmlFor="identity-emoji">Emoji</Label>
                <Input
                  id="identity-emoji"
                  value={newIdentityEmoji}
                  onChange={(e) => setNewIdentityEmoji(e.target.value)}
                  className="text-center text-xl"
                  placeholder="🎯"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="identity-name">Identity</Label>
                <Input
                  id="identity-name"
                  value={newIdentityName}
                  onChange={(e) => setNewIdentityName(e.target.value)}
                  placeholder="Disciplined international developer"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddIdentity(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Identity Dialog */}
      <Dialog
        open={!!editingIdentity}
        onOpenChange={(open) => !open && setEditingIdentity(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Identity</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateIdentity} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20 space-y-1.5">
                <Label htmlFor="edit-identity-emoji">Emoji</Label>
                <Input
                  id="edit-identity-emoji"
                  value={editingIdentity?.emoji || ""}
                  onChange={(e) =>
                    setEditingIdentity((prev) =>
                      prev ? { ...prev, emoji: e.target.value } : null,
                    )
                  }
                  className="text-center text-xl"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="edit-identity-name">Identity</Label>
                <Input
                  id="edit-identity-name"
                  value={editingIdentity?.name || ""}
                  onChange={(e) =>
                    setEditingIdentity((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    )
                  }
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (editingIdentity) {
                    setDeleteConfirm({
                      type: "identity",
                      id: editingIdentity.id,
                    });
                    setEditingIdentity(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingIdentity(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Create a one-time task. Unlike habits, tasks disappear once
              completed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addTask} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20 space-y-1.5">
                <Label htmlFor="task-emoji">Emoji</Label>
                <Input
                  id="task-emoji"
                  value={newTaskEmoji}
                  onChange={(e) => setNewTaskEmoji(e.target.value)}
                  className="text-center text-xl"
                  placeholder="⚡"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="task-name">Name</Label>
                <Input
                  id="task-name"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Task name..."
                  autoFocus
                />
              </div>
            </div>
            {identities.length > 0 && (
              <div className="space-y-1.5">
                <Label>Link to Identity (optional)</Label>
                <Select
                  value={newTaskIdentityId || "none"}
                  onValueChange={(value) =>
                    setNewTaskIdentityId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No identity (General)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No identity (General)</SelectItem>
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>
                        {identity.emoji} {identity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="task-due-date">Due Date (optional)</Label>
              <Input
                id="task-due-date"
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTask(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateTask} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20 space-y-1.5">
                <Label htmlFor="edit-task-emoji">Emoji</Label>
                <Input
                  id="edit-task-emoji"
                  value={editingTask?.emoji || ""}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev ? { ...prev, emoji: e.target.value } : null,
                    )
                  }
                  className="text-center text-xl"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="edit-task-name">Name</Label>
                <Input
                  id="edit-task-name"
                  value={editingTask?.name || ""}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    )
                  }
                  autoFocus
                />
              </div>
            </div>
            {identities.length > 0 && (
              <div className="space-y-1.5">
                <Label>Link to Identity</Label>
                <Select
                  value={editingTask?.identityId || "none"}
                  onValueChange={(value) =>
                    setEditingTask((prev) =>
                      prev
                        ? {
                            ...prev,
                            identityId: value === "none" ? null : value,
                          }
                        : null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No identity (General)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No identity (General)</SelectItem>
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>
                        {identity.emoji} {identity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-due-date">Due Date (optional)</Label>
              <Input
                id="edit-task-due-date"
                type="date"
                value={editingTask?.dueDate || ""}
                onChange={(e) =>
                  setEditingTask((prev) =>
                    prev ? { ...prev, dueDate: e.target.value } : null,
                  )
                }
              />
            </div>
            <div className="flex gap-2 justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (editingTask) {
                    setDeleteConfirm({
                      type: "task",
                      id: editingTask.id,
                    });
                    setEditingTask(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "habit"
                ? "This will permanently delete this habit."
                : deleteConfirm?.type === "task"
                  ? "This will permanently delete this task."
                  : "This will delete the identity and unlink all associated activities."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Rest & Recovery Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Weekly Rest Days */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4" />
                Weekly Rest Days
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select days where habits are paused for rest
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { day: 0, label: "Sun" },
                  { day: 1, label: "Mon" },
                  { day: 2, label: "Tue" },
                  { day: 3, label: "Wed" },
                  { day: 4, label: "Thu" },
                  { day: 5, label: "Fri" },
                  { day: 6, label: "Sat" },
                ].map(({ day, label }) => (
                  <Button
                    key={day}
                    variant={tempRestDays.includes(day) ? "default" : "outline"}
                    size="sm"
                    className={tempRestDays.includes(day) ? "bg-purple-600 hover:bg-purple-700" : ""}
                    onClick={() => {
                      setTempRestDays(prev => 
                        prev.includes(day) 
                          ? prev.filter(d => d !== day)
                          : [...prev, day]
                      );
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Vacation Mode */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Palmtree className="w-4 h-4" />
                  Vacation Mode
                </Label>
                <Button
                  variant={tempVacationMode ? "default" : "outline"}
                  size="sm"
                  className={tempVacationMode ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                  onClick={() => setTempVacationMode(!tempVacationMode)}
                >
                  {tempVacationMode ? "On" : "Off"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Pause all habit tracking for a date range
              </p>
              
              {tempVacationMode && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-sm mb-1 block">Start Date</Label>
                    <Input
                      type="date"
                      value={tempVacationStart}
                      onChange={(e) => setTempVacationStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-1 block">End Date</Label>
                    <Input
                      type="date"
                      value={tempVacationEnd}
                      onChange={(e) => setTempVacationEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// HabitCard Component
function HabitCard({
  habit,
  dayMode,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  dayMode: LoadMode;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}) {
  // Get the description based on current mode
  const getDescription = () => {
    switch (dayMode) {
      case "FULL":
        return habit.fullDescription;
      case "RECOVERY":
        return habit.recoveryDescription;
      case "MINIMAL":
        return habit.minimalDescription;
      default:
        return null;
    }
  };

  // Get frequency label
  const getFrequencyLabel = () => {
    switch (habit.frequency) {
      case "WEEKDAYS":
        return "Mon-Fri";
      case "WEEKENDS":
        return "Sat-Sun";
      case "SPECIFIC_DAYS":
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return habit.scheduledDays.map((d) => dayNames[d].charAt(0)).join("");
      case "X_PER_WEEK":
        return `${habit.completionsThisWeek || 0}/${habit.targetPerWeek}/wk`;
      default:
        return null;
    }
  };

  const description = getDescription();
  const frequencyLabel = getFrequencyLabel();
  const completedModeLabel =
    habit.completionMode === "FULL"
      ? "🟢"
      : habit.completionMode === "RECOVERY"
        ? "🟡"
        : "🔴";

  return (
    <Card
      className={`transition-all duration-200 overflow-hidden ${
        habit.completed
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : ""
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <button
            onClick={() => onToggle(habit.id)}
            className="flex items-start gap-2 sm:gap-3 flex-1 text-left min-w-0"
          >
            <span className="text-xl sm:text-2xl shrink-0 mt-0.5">
              {habit.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span
                  className={`font-medium break-words ${
                    habit.completed
                      ? "text-green-700 dark:text-green-400 line-through"
                      : ""
                  }`}
                >
                  {habit.name}
                  {habit.completed && habit.completionMode && (
                    <span className="ml-1 sm:ml-2 text-sm">
                      {completedModeLabel}
                    </span>
                  )}
                </span>
                {frequencyLabel && (
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground whitespace-nowrap">
                    {frequencyLabel}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5 break-words">
                  {description}
                </p>
              )}
            </div>
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                habit.completed
                  ? "bg-green-500 border-green-500"
                  : "border-muted-foreground/30"
              }`}
            >
              {habit.completed && (
                <Check
                  className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                  strokeWidth={3}
                />
              )}
            </div>
          </button>

          <div className="flex gap-0.5 sm:gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(habit)}
              className="text-muted-foreground hover:text-foreground h-7 w-7 sm:h-8 sm:w-8"
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(habit.id)}
              className="text-muted-foreground hover:text-destructive h-7 w-7 sm:h-8 sm:w-8"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// TaskCard Component
function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  // Format due date if present
  const getDueDateLabel = () => {
    if (!task.dueDate) return null;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    dueDate.setUTCHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0)
      return {
        label: "Overdue",
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      };
    if (diffDays === 0)
      return {
        label: "Today",
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      };
    if (diffDays === 1)
      return {
        label: "Tomorrow",
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      };
    return {
      label: dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      className: "bg-muted text-muted-foreground",
    };
  };

  const dueDateInfo = getDueDateLabel();

  return (
    <Card
      className={`transition-all duration-200 overflow-hidden ${
        task.completed
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : ""
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <button
            onClick={() => onToggle(task.id)}
            className="flex items-start gap-2 sm:gap-3 flex-1 text-left min-w-0"
          >
            <span className="text-xl sm:text-2xl shrink-0 mt-0.5">
              {task.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span
                  className={`font-medium break-words ${
                    task.completed
                      ? "text-green-700 dark:text-green-400 line-through"
                      : ""
                  }`}
                >
                  {task.name}
                </span>
              </div>
              {/* Badges on second line for mobile */}
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <span className="text-xs px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 rounded text-violet-700 dark:text-violet-400 whitespace-nowrap">
                  ⚡ one-time
                </span>
                {dueDateInfo && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${dueDateInfo.className}`}
                  >
                    {dueDateInfo.label}
                  </span>
                )}
              </div>
            </div>
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                task.completed
                  ? "bg-green-500 border-green-500"
                  : "border-muted-foreground/30"
              }`}
            >
              {task.completed && (
                <Check
                  className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                  strokeWidth={3}
                />
              )}
            </div>
          </button>

          <div className="flex gap-0.5 sm:gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(task)}
              className="text-muted-foreground hover:text-foreground h-7 w-7 sm:h-8 sm:w-8"
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(task.id)}
              className="text-muted-foreground hover:text-destructive h-7 w-7 sm:h-8 sm:w-8"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
