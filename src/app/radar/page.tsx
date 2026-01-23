"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Brain,
  Briefcase,
  Rocket,
  Home,
  Save,
  History,
} from "lucide-react";

type RadarStatus = "RED" | "YELLOW" | "GREEN";

type LifeRadar = {
  id: string | null;
  weekStart: string;
  body: RadarStatus;
  mind: RadarStatus;
  profession: RadarStatus;
  projects: RadarStatus;
  environment: RadarStatus;
  notes: string | null;
  isNew?: boolean;
};

type HistoryEntry = {
  id: string;
  weekStart: string;
  body: RadarStatus;
  mind: RadarStatus;
  profession: RadarStatus;
  projects: RadarStatus;
  environment: RadarStatus;
};

const areas = [
  {
    key: "body",
    label: "Body",
    emoji: "💪",
    icon: Heart,
    description: "Health, exercise, sleep, nutrition",
  },
  {
    key: "mind",
    label: "Mind",
    emoji: "🧠",
    icon: Brain,
    description: "Mental health, learning, meditation",
  },
  {
    key: "profession",
    label: "Profession",
    emoji: "💼",
    icon: Briefcase,
    description: "Work, career, income",
  },
  {
    key: "projects",
    label: "Projects",
    emoji: "🚀",
    icon: Rocket,
    description: "Side projects, goals, dreams",
  },
  {
    key: "environment",
    label: "Environment",
    emoji: "🏠",
    icon: Home,
    description: "Home, relationships, social",
  },
] as const;

const statusConfig = {
  GREEN: { color: "bg-green-500", label: "Good", emoji: "🟢" },
  YELLOW: { color: "bg-yellow-500", label: "Warning", emoji: "🟡" },
  RED: { color: "bg-red-500", label: "Needs attention", emoji: "🔴" },
};

export default function RadarPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [radar, setRadar] = useState<LifeRadar | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchRadar = useCallback(async () => {
    try {
      const res = await fetch("/api/radar");
      if (res.ok) {
        const data = await res.json();
        setRadar(data);
      }
    } catch (error) {
      console.error("Failed to fetch radar:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/radar/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchRadar();
      fetchHistory();
    }
  }, [session, fetchRadar, fetchHistory]);

  const updateStatus = (area: string, status: RadarStatus) => {
    if (!radar) return;
    setRadar({ ...radar, [area]: status });
  };

  const saveRadar = async () => {
    if (!radar) return;
    setSaving(true);

    try {
      const res = await fetch("/api/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: radar.body,
          mind: radar.mind,
          profession: radar.profession,
          projects: radar.projects,
          environment: radar.environment,
          notes: radar.notes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRadar({ ...data, isNew: false });
        fetchHistory();
      }
    } catch (error) {
      console.error("Failed to save radar:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatWeekDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Count status
  const getStatusCounts = () => {
    if (!radar) return { red: 0, yellow: 0, green: 0 };
    const statuses = [
      radar.body,
      radar.mind,
      radar.profession,
      radar.projects,
      radar.environment,
    ];
    return {
      red: statuses.filter((s) => s === "RED").length,
      yellow: statuses.filter((s) => s === "YELLOW").length,
      green: statuses.filter((s) => s === "GREEN").length,
    };
  };

  const counts = getStatusCounts();

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <header className="border-b">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-7 w-32" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          {/* Week Header Skeleton */}
          <div className="mb-8 text-center">
            <Skeleton className="h-4 w-24 mx-auto mb-2" />
            <Skeleton className="h-8 w-40 mx-auto mb-2" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>

          {/* Status Summary Skeleton */}
          <div className="mb-8">
            <div className="flex justify-center gap-6">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>

          {/* Radar Areas Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-24 mb-1" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Notes Skeleton */}
          <div className="mt-8">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!session || !radar) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">📡 Life Radar</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Week Info */}
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Weekly Check-in
          </p>
          <h2 className="text-2xl font-bold mt-1">
            Week of {formatWeekDate(radar.weekStart)}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            See imbalance before you collapse
          </p>
        </div>

        {/* Summary */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xl">🟢</span>
            <span className="font-bold">{counts.green}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🟡</span>
            <span className="font-bold">{counts.yellow}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔴</span>
            <span className="font-bold">{counts.red}</span>
          </div>
        </div>

        {/* Radar Bars */}
        <div className="space-y-4 mb-8">
          {areas.map((area) => {
            const status = radar[area.key as keyof LifeRadar] as RadarStatus;
            const Icon = area.icon;

            return (
              <Card key={area.key}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{area.emoji}</span>
                      <div>
                        <p className="font-medium">{area.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {area.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(["GREEN", "YELLOW", "RED"] as RadarStatus[]).map(
                        (s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(area.key, s)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                              status === s
                                ? `${statusConfig[s].color} scale-110 ring-2 ring-offset-2 ring-offset-background ring-${s.toLowerCase()}-500`
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            {statusConfig[s].emoji}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Notes */}
        <div className="space-y-2 mb-8">
          <Label htmlFor="notes">Reflection (optional)</Label>
          <Textarea
            id="notes"
            value={radar.notes || ""}
            onChange={(e) => setRadar({ ...radar, notes: e.target.value })}
            placeholder="What's going well? What needs attention?"
            className="min-h-25"
          />
        </div>

        {/* Save Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={saveRadar}
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving
            ? "Saving..."
            : radar.isNew
              ? "Save Check-in"
              : "Update Check-in"}
        </Button>

        {/* Warning Message */}
        {counts.red >= 2 && (
          <Card className="mt-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="py-4 text-center">
              <span className="text-2xl">⚠️</span>
              <p className="mt-2 text-red-700 dark:text-red-400 font-medium">
                Multiple areas need attention. Consider using Recovery or
                Minimal mode today.
              </p>
            </CardContent>
          </Card>
        )}

        {/* All Green Message */}
        {counts.green === 5 && (
          <Card className="mt-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="py-4 text-center">
              <span className="text-2xl">🌟</span>
              <p className="mt-2 text-green-700 dark:text-green-400 font-medium">
                All areas balanced! Keep up the great work.
              </p>
            </CardContent>
          </Card>
        )}

        {/* History Section */}
        {showHistory && history.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Past Weeks
            </h3>
            <div className="space-y-2">
              {history.map((entry) => (
                <Card key={entry.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatWeekDate(entry.weekStart)}
                    </span>
                    <div className="flex gap-1">
                      {areas.map((area) => (
                        <span key={area.key} title={area.label}>
                          {
                            statusConfig[
                              entry[
                                area.key as keyof HistoryEntry
                              ] as RadarStatus
                            ]?.emoji
                          }
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
