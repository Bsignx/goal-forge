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
} from "lucide-react";
import Link from "next/link";

// Types
type LoadMode = "FULL" | "RECOVERY" | "MINIMAL";

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
};

type EditingHabit = {
  id: string;
  name: string;
  emoji: string;
  identityId: string | null;
  fullDescription: string;
  recoveryDescription: string;
  minimalDescription: string;
} | null;

type EditingIdentity = {
  id: string;
  name: string;
  emoji: string;
} | null;

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayMode, setDayMode] = useState<LoadMode>("FULL");

  // Dialogs
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddIdentity, setShowAddIdentity] = useState(false);
  const [editingHabit, setEditingHabit] = useState<EditingHabit>(null);
  const [editingIdentity, setEditingIdentity] = useState<EditingIdentity>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "habit" | "identity";
    id: string;
  } | null>(null);

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

  // Form state
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✅");
  const [newHabitIdentityId, setNewHabitIdentityId] = useState<string>("");
  const [newHabitFull, setNewHabitFull] = useState("");
  const [newHabitRecovery, setNewHabitRecovery] = useState("");
  const [newHabitMinimal, setNewHabitMinimal] = useState("");
  const [newIdentityName, setNewIdentityName] = useState("");
  const [newIdentityEmoji, setNewIdentityEmoji] = useState("🎯");

  // Fetch functions
  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits/today");
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

  // Effects
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchHabits();
      fetchIdentities();
      fetchStoicEntry();
    }
  }, [session, fetchHabits, fetchIdentities, fetchStoicEntry]);

  // Handlers
  const handleSignOut = async () => {
    await signOut();
    router.push("/");
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
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: dayMode }),
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

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHabitName,
          emoji: newHabitEmoji,
          identityId: newHabitIdentityId || null,
          fullDescription: newHabitFull || null,
          recoveryDescription: newHabitRecovery || null,
          minimalDescription: newHabitMinimal || null,
        }),
      });
      if (res.ok) {
        setNewHabitName("");
        setNewHabitEmoji("✅");
        setNewHabitIdentityId("");
        setNewHabitFull("");
        setNewHabitRecovery("");
        setNewHabitMinimal("");
        setShowAddHabit(false);
        fetchHabits();
      }
    } catch (error) {
      console.error("Failed to add habit:", error);
    }
  };

  const addIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentityName.trim()) return;

    try {
      const res = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newIdentityName,
          emoji: newIdentityEmoji,
        }),
      });
      if (res.ok) {
        setNewIdentityName("");
        setNewIdentityEmoji("🎯");
        setShowAddIdentity(false);
        fetchIdentities();
      }
    } catch (error) {
      console.error("Failed to add identity:", error);
    }
  };

  const updateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit || !editingHabit.name.trim()) return;

    try {
      const res = await fetch(`/api/habits/${editingHabit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingHabit.name,
          emoji: editingHabit.emoji,
          identityId: editingHabit.identityId,
          fullDescription: editingHabit.fullDescription || null,
          recoveryDescription: editingHabit.recoveryDescription || null,
          minimalDescription: editingHabit.minimalDescription || null,
        }),
      });
      if (res.ok) {
        setEditingHabit(null);
        fetchHabits();
      }
    } catch (error) {
      console.error("Failed to update habit:", error);
    }
  };

  const updateIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdentity || !editingIdentity.name.trim()) return;

    try {
      const res = await fetch(`/api/identities/${editingIdentity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingIdentity.name,
          emoji: editingIdentity.emoji,
        }),
      });
      if (res.ok) {
        setEditingIdentity(null);
        fetchIdentities();
        fetchHabits();
      }
    } catch (error) {
      console.error("Failed to update identity:", error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const endpoint =
        deleteConfirm.type === "habit"
          ? `/api/habits/${deleteConfirm.id}`
          : `/api/identities/${deleteConfirm.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        if (deleteConfirm.type === "habit") {
          setHabits((prev) => prev.filter((h) => h.id !== deleteConfirm.id));
        } else {
          setIdentities((prev) =>
            prev.filter((i) => i.id !== deleteConfirm.id),
          );
          fetchHabits();
        }
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Computed values
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const completedCount = habits.filter((h) => h.completed).length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Loading state
  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
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
        {/* Daily Header */}
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Daily Panel
          </p>
          <h2 className="text-2xl font-bold capitalize mt-1">
            {formattedDate}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            Just today. Nothing from yesterday. Nothing from tomorrow.
          </p>
        </div>

        {/* Load Mode Selector (Anti-Burnout) */}
        <div className="mb-8">
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
            Reflexão Estoica
          </p>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-base font-medium">{stoicQuestion}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Resposta curta e objetiva (máx. 300 caracteres)
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
                  placeholder="Escreva sua reflexão..."
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
                    {savingStoic
                      ? "Salvando..."
                      : stoicEntry
                        ? "Atualizar"
                        : "Salvar"}
                  </Button>
                </div>
              </div>
              {stoicEntry && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Reflexão salva
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Daily Progress</span>
              <span>
                {completedCount}/{totalCount} ({Math.round(progress)}%)
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        )}

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

        {/* Habits Section */}
        <div className="space-y-6">
          {/* Habits grouped by identity */}
          {identities.map((identity) => {
            const identityHabits = habits.filter(
              (h) => h.identityId === identity.id,
            );
            if (identityHabits.length === 0) return null;

            return (
              <div key={identity.id}>
                <div className="flex items-center gap-2 mb-3">
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
                        })
                      }
                      onDelete={(id) => setDeleteConfirm({ type: "habit", id })}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Habits without identity */}
          {habits.filter((h) => !h.identityId).length > 0 && (
            <div>
              {identities.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
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
                        })
                      }
                      onDelete={(id) => setDeleteConfirm({ type: "habit", id })}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {habits.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">No activities registered yet.</p>
              <p className="text-sm">Click the button below to add one!</p>
            </div>
          )}
        </div>

        {/* Add Habit Button */}
        <Button
          variant="outline"
          className="mt-6 w-full py-6 border-dashed"
          onClick={() => setShowAddHabit(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add activity
        </Button>

        {/* Celebration */}
        {completedCount === totalCount && totalCount > 0 && (
          <Card className="mt-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="py-6 text-center">
              <span className="text-4xl">🎉</span>
              <p className="mt-2 text-green-700 dark:text-green-400 font-medium">
                Congratulations! You completed all activities for today!
              </p>
            </CardContent>
          </Card>
        )}
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
                ? "This will permanently delete this activity."
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

  const description = getDescription();
  const completedModeLabel =
    habit.completionMode === "MINIMAL"
      ? "🟢"
      : habit.completionMode === "RECOVERY"
        ? "🟡"
        : "🔴";

  return (
    <Card
      className={`transition-all duration-200 ${
        habit.completed
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : ""
      }`}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <button
          onClick={() => onToggle(habit.id)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <span className="text-2xl">{habit.emoji}</span>
          <div className="flex-1">
            <span
              className={`font-medium ${
                habit.completed
                  ? "text-green-700 dark:text-green-400 line-through"
                  : ""
              }`}
            >
              {habit.name}
              {habit.completed && habit.completionMode && (
                <span className="ml-2 text-sm">{completedModeLabel}</span>
              )}
            </span>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              habit.completed
                ? "bg-green-500 border-green-500"
                : "border-muted-foreground/30"
            }`}
          >
            {habit.completed && (
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            )}
          </div>
        </button>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(habit)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(habit.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
