"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Flame,
  Zap,
  Brain,
  Clock,
  BarChart3,
  Activity,
  Heart,
  Sparkles,
  Briefcase,
  Folder,
  Home,
} from "lucide-react";
import Link from "next/link";

type HabitStat = {
  id: string;
  name: string;
  emoji: string;
  identity?: string;
  completedDays: number;
  expectedDays: number;
  completionRate: number;
  trend: number;
};

type DailyData = {
  date: string;
  count: number;
  label: string;
};

type FocusDay = {
  date: string;
  minutes: number;
  label: string;
};

type TopActivity = {
  name: string;
  emoji: string;
  type: string;
  totalMinutes: number;
  sessions: number;
};

type StreakData = {
  id: string;
  name: string;
  emoji: string;
  streak: number;
};

type RadarSummary = {
  weeksTracked: number;
  averages: Record<string, number>;
  latest: Record<string, string>;
} | null;

type Stats = {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  habits: {
    overallRate: number;
    totalCompleted: number;
    totalExpected: number;
    byHabit: HabitStat[];
    dailyData: DailyData[];
  };
  energy: {
    distribution: {
      FULL: number;
      RECOVERY: number;
      MINIMAL: number;
    };
    byDayOfWeek: Record<
      string,
      { FULL: number; RECOVERY: number; MINIMAL: number }
    >;
    totalDays: number;
  };
  focus: {
    totalMinutes: number;
    totalSessions: number;
    avgMinutesPerDay: number;
    byDay: FocusDay[];
    topActivities: TopActivity[];
  };
  radar: RadarSummary;
  streaks: StreakData[];
};

export default function StatsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?period=${p}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchStats(period);
    }
  }, [session, period, fetchStats]);

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-stone-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "GREEN":
        return "bg-green-500";
      case "YELLOW":
        return "bg-yellow-500";
      case "RED":
        return "bg-red-500";
      default:
        return "bg-stone-500";
    }
  };

  const getRadarIcon = (area: string) => {
    switch (area) {
      case "body":
        return <Heart className="h-4 w-4" />;
      case "mind":
        return <Sparkles className="h-4 w-4" />;
      case "profession":
        return <Briefcase className="h-4 w-4" />;
      case "projects":
        return <Folder className="h-4 w-4" />;
      case "environment":
        return <Home className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">
          Loading statistics...
        </div>
      </div>
    );
  }

  if (!session) return null;

  const maxDailyCount = stats?.habits.dailyData.length
    ? Math.max(...stats.habits.dailyData.map((d) => d.count), 1)
    : 1;

  const maxFocusMinutes = stats?.focus.byDay.length
    ? Math.max(...stats.focus.byDay.map((d) => d.minutes), 1)
    : 1;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon-sm">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <h1 className="text-xl font-bold">Statistics</h1>
            </div>
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-stone-800 border-stone-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-700">
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.habits.overallRate || 0}%
                  </p>
                  <p className="text-xs text-stone-400">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.habits.totalCompleted || 0}
                  </p>
                  <p className="text-xs text-stone-400">Habits Done</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatMinutes(stats?.focus.totalMinutes || 0)}
                  </p>
                  <p className="text-xs text-stone-400">Focus Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.focus.totalSessions || 0}
                  </p>
                  <p className="text-xs text-stone-400">Pomodoros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Habit Completion Chart */}
        {stats && stats.habits.dailyData.length > 0 && (
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Daily Completions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-end gap-1 md:gap-2">
                {stats.habits.dailyData.map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-purple-500/80 rounded-t transition-all duration-300 hover:bg-purple-400"
                      style={{
                        height: `${Math.max((day.count / maxDailyCount) * 100, 4)}%`,
                        minHeight: day.count > 0 ? "8px" : "4px",
                      }}
                      title={`${day.count} completions`}
                    />
                    <span className="text-[10px] text-stone-500">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Best Performing Habits */}
        {stats && stats.habits.byHabit.length > 0 && (
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Habit Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.habits.byHabit.slice(0, 6).map((habit) => (
                  <div key={habit.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{habit.emoji}</span>
                        <span className="text-sm font-medium">
                          {habit.name}
                        </span>
                        {habit.identity && (
                          <span className="text-xs text-stone-500">
                            ({habit.identity})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          {habit.completionRate}%
                        </span>
                        {getTrendIcon(habit.trend)}
                      </div>
                    </div>
                    <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          habit.completionRate >= 80
                            ? "bg-green-500"
                            : habit.completionRate >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${habit.completionRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-stone-500">
                      {habit.completedDays} of {habit.expectedDays} days
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Energy Level Patterns */}
        {stats && stats.energy.totalDays > 0 && (
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Energy Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Distribution */}
                <div>
                  <p className="text-sm text-stone-400 mb-3">Distribution</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm flex-1">Full Energy</span>
                      <span className="text-sm font-medium">
                        {stats.energy.distribution.FULL}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm flex-1">Recovery</span>
                      <span className="text-sm font-medium">
                        {stats.energy.distribution.RECOVERY}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm flex-1">Minimal</span>
                      <span className="text-sm font-medium">
                        {stats.energy.distribution.MINIMAL}
                      </span>
                    </div>
                  </div>
                </div>

                {/* By Day of Week */}
                <div>
                  <p className="text-sm text-stone-400 mb-3">By Day of Week</p>
                  <div className="flex gap-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day) => {
                        const data = stats.energy.byDayOfWeek[day];
                        const total = data.FULL + data.RECOVERY + data.MINIMAL;
                        const fullPct =
                          total > 0 ? (data.FULL / total) * 100 : 0;
                        const recoveryPct =
                          total > 0 ? (data.RECOVERY / total) * 100 : 0;

                        return (
                          <div
                            key={day}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <div className="w-full h-16 bg-stone-800 rounded overflow-hidden flex flex-col-reverse">
                              <div
                                className="w-full bg-green-500"
                                style={{ height: `${fullPct}%` }}
                              />
                              <div
                                className="w-full bg-yellow-500"
                                style={{ height: `${recoveryPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-stone-500">
                              {day.charAt(0)}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Focus Time Trends */}
        {stats && stats.focus.byDay.length > 0 && (
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  Focus Time Trends
                </CardTitle>
                <span className="text-sm text-stone-400">
                  Avg: {stats.focus.avgMinutesPerDay}min/day
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-end gap-1 md:gap-2 mb-4">
                {stats.focus.byDay.map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-blue-500/80 rounded-t transition-all duration-300 hover:bg-blue-400"
                      style={{
                        height: `${Math.max((day.minutes / maxFocusMinutes) * 100, 4)}%`,
                        minHeight: day.minutes > 0 ? "8px" : "4px",
                      }}
                      title={`${day.minutes} minutes`}
                    />
                    <span className="text-[10px] text-stone-500">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Top Activities */}
              {stats.focus.topActivities.length > 0 && (
                <div className="border-t border-stone-800 pt-4">
                  <p className="text-sm text-stone-400 mb-3">Top Activities</p>
                  <div className="space-y-2">
                    {stats.focus.topActivities.map((activity, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span>{activity.emoji}</span>
                          <span className="text-sm">{activity.name}</span>
                          {activity.type !== "custom" && (
                            <span className="text-xs text-stone-500">
                              ({activity.type})
                            </span>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">
                            {formatMinutes(activity.totalMinutes)}
                          </span>
                          <span className="text-stone-500 ml-1">
                            ({activity.sessions})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Streaks */}
        {stats && stats.streaks.length > 0 && (
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Current Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {stats.streaks
                  .filter((s) => s.streak > 0)
                  .map((streak) => (
                    <div
                      key={streak.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-stone-800/50"
                    >
                      <span className="text-xl">{streak.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {streak.name}
                        </p>
                        <p className="text-xs text-orange-500">
                          🔥 {streak.streak} days
                        </p>
                      </div>
                    </div>
                  ))}
                {stats.streaks.filter((s) => s.streak > 0).length === 0 && (
                  <p className="text-sm text-stone-500 col-span-full">
                    No active streaks yet. Start completing habits daily!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Life Radar Summary */}
        {stats?.radar && (
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-500" />
                  Life Balance
                </CardTitle>
                <span className="text-sm text-stone-400">
                  {stats.radar.weeksTracked} weeks tracked
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {["body", "mind", "profession", "projects", "environment"].map(
                  (area) => (
                    <div
                      key={area}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(
                          stats.radar!.latest[area],
                        )}`}
                      >
                        {getRadarIcon(area)}
                      </div>
                      <span className="text-xs text-stone-400 capitalize">
                        {area}
                      </span>
                      <span className="text-xs font-medium">
                        {stats.radar!.averages[area].toFixed(1)}/3
                      </span>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
