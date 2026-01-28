"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Coffee,
  Brain,
  Timer,
  ChevronLeft,
  Volume2,
  VolumeX,
  Target,
  Flame,
} from "lucide-react";
import Link from "next/link";

type TimerMode = "work" | "shortBreak" | "longBreak";

type PomodoroSettings = {
  workDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
};

type PomodoroSession = {
  id: string;
  mode: TimerMode;
  duration: number;
  completedAt: Date;
  taskName?: string;
};

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
};

const STORAGE_KEY = "pomodoro-settings";
const SESSIONS_KEY = "pomodoro-sessions";

export default function PomodoroPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Timer state
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [currentTask, setCurrentTask] = useState("");

  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] =
    useState<PomodoroSettings>(DEFAULT_SETTINGS);

  // Sessions history (today only)
  const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);

  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load settings and sessions from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      setTimeLeft(parsed.workDuration * 60);
    }

    const savedSessions = localStorage.getItem(SESSIONS_KEY);
    if (savedSessions) {
      const parsed: PomodoroSession[] = JSON.parse(savedSessions);
      // Filter only today's sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOnly = parsed.filter((s) => {
        const sessionDate = new Date(s.completedAt);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });
      setTodaySessions(todayOnly);
      // Count work sessions for today
      setCompletedSessions(todayOnly.filter((s) => s.mode === "work").length);
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [settings.soundEnabled]);

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    playSound();

    // Save session
    const newSession: PomodoroSession = {
      id: Date.now().toString(),
      mode,
      duration: getDuration(mode),
      completedAt: new Date(),
      taskName: currentTask || undefined,
    };

    const updatedSessions = [...todaySessions, newSession];
    setTodaySessions(updatedSessions);

    // Save to localStorage (keep last 7 days)
    const allSessions = JSON.parse(
      localStorage.getItem(SESSIONS_KEY) || "[]",
    ) as PomodoroSession[];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentSessions = allSessions.filter(
      (s) => new Date(s.completedAt) > weekAgo,
    );
    localStorage.setItem(
      SESSIONS_KEY,
      JSON.stringify([...recentSessions, newSession]),
    );

    if (mode === "work") {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);

      // Determine next break type
      const isLongBreak = newCount % settings.sessionsUntilLongBreak === 0;
      const nextMode = isLongBreak ? "longBreak" : "shortBreak";
      setMode(nextMode);
      setTimeLeft(
        isLongBreak
          ? settings.longBreakDuration * 60
          : settings.shortBreakDuration * 60,
      );

      if (settings.autoStartBreaks) {
        setIsRunning(true);
      }
    } else {
      // After break, go back to work
      setMode("work");
      setTimeLeft(settings.workDuration * 60);

      if (settings.autoStartWork) {
        setIsRunning(true);
      }
    }
  }, [
    mode,
    completedSessions,
    settings,
    currentTask,
    todaySessions,
    playSound,
  ]);

  // Get duration based on mode
  const getDuration = (m: TimerMode): number => {
    switch (m) {
      case "work":
        return settings.workDuration;
      case "shortBreak":
        return settings.shortBreakDuration;
      case "longBreak":
        return settings.longBreakDuration;
    }
  };

  // Switch mode manually
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getDuration(newMode) * 60);
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode) * 60);
  };

  // Save settings
  const saveSettings = () => {
    setSettings(tempSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSettings));

    // Update current timer if not running
    if (!isRunning) {
      setTimeLeft(
        mode === "work"
          ? tempSettings.workDuration * 60
          : mode === "shortBreak"
            ? tempSettings.shortBreakDuration * 60
            : tempSettings.longBreakDuration * 60,
      );
    }

    setShowSettings(false);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const getProgress = (): number => {
    const total = getDuration(mode) * 60;
    return ((total - timeLeft) / total) * 100;
  };

  // Get mode colors and icons
  const getModeInfo = (m: TimerMode) => {
    switch (m) {
      case "work":
        return {
          label: "Focus",
          color: "text-orange-500",
          bgColor: "bg-orange-500/20",
          borderColor: "border-orange-500/50",
          icon: Brain,
        };
      case "shortBreak":
        return {
          label: "Short Break",
          color: "text-green-500",
          bgColor: "bg-green-500/20",
          borderColor: "border-green-500/50",
          icon: Coffee,
        };
      case "longBreak":
        return {
          label: "Long Break",
          color: "text-blue-500",
          bgColor: "bg-blue-500/20",
          borderColor: "border-blue-500/50",
          icon: Coffee,
        };
    }
  };

  // Calculate today's focus time
  const getTodayFocusTime = (): number => {
    return todaySessions
      .filter((s) => s.mode === "work")
      .reduce((acc, s) => acc + s.duration, 0);
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const modeInfo = getModeInfo(mode);
  const ModeIcon = modeInfo.icon;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source
          src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRs8j9HNkHsxMZDQ2aB8Hjqg1d+lYxA2qdDWpWYaJIvT4alrHDWJxNagbSI/kMHRl3MhNpbK15RtGiaT0dmfbh0uk8nTlnMZLYPR3KVtDDWP0dykcxkvj8/YoHQaL47N1Jp3HymKzc+aeBclk8nPmnoaKY3Ix5eCGCaFxs2ZeRUoi8LKmn0VH4bFyJl6FiKIxMiXexUnhMPFl34WI4jDxpZ9FCWExMaYfRQjgsXFl30VJYPExZh9EyWEw8WXfhMlhMLFlX4SJ4TDxJV+EiaEw8SVfRMlhMPElX0TJoTCxJV+EiaEwsSVfhImhMLElX4SJoTCxJV+EiaEwsSVfhImhMLElX4SJg=="
          type="audio/wav"
        />
      </audio>

      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon-sm">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-500" />
              <h1 className="text-xl font-bold">Pomodoro</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setSettings((prev) => ({
                  ...prev,
                  soundEnabled: !prev.soundEnabled,
                }));
                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify({
                    ...settings,
                    soundEnabled: !settings.soundEnabled,
                  }),
                );
              }}
            >
              {settings.soundEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5 text-stone-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setTempSettings(settings);
                setShowSettings(true);
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Mode Selector */}
        <div className="flex justify-center gap-2">
          {(["work", "shortBreak", "longBreak"] as TimerMode[]).map((m) => {
            const info = getModeInfo(m);
            return (
              <Button
                key={m}
                variant={mode === m ? "default" : "outline"}
                size="sm"
                onClick={() => switchMode(m)}
                className={mode === m ? info.bgColor : ""}
              >
                {info.label}
              </Button>
            );
          })}
        </div>

        {/* Timer Display */}
        <Card
          className={`border-2 ${modeInfo.borderColor} bg-stone-900/50 relative overflow-hidden`}
        >
          {/* Progress bar background */}
          <div
            className={`absolute bottom-0 left-0 h-1 ${modeInfo.bgColor} transition-all duration-1000`}
            style={{ width: `${getProgress()}%` }}
          />

          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-6">
              {/* Mode indicator */}
              <div
                className={`flex items-center gap-2 ${modeInfo.color} ${modeInfo.bgColor} px-4 py-2 rounded-full`}
              >
                <ModeIcon className="h-5 w-5" />
                <span className="font-medium">{modeInfo.label}</span>
              </div>

              {/* Timer */}
              <div className="text-8xl font-mono font-bold tracking-tight">
                {formatTime(timeLeft)}
              </div>

              {/* Task input */}
              {mode === "work" && (
                <div className="w-full max-w-xs">
                  <Input
                    placeholder="What will you focus on?"
                    value={currentTask}
                    onChange={(e) => setCurrentTask(e.target.value)}
                    className="text-center bg-stone-800/50 border-stone-700"
                    disabled={isRunning}
                  />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon-lg"
                  onClick={resetTimer}
                  disabled={timeLeft === getDuration(mode) * 60}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  className={`h-16 w-16 rounded-full ${
                    isRunning
                      ? "bg-stone-700 hover:bg-stone-600"
                      : `${modeInfo.bgColor} hover:opacity-90`
                  }`}
                  onClick={() => setIsRunning(!isRunning)}
                >
                  {isRunning ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
                <div className="w-10" /> {/* Spacer for alignment */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Target className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedSessions}</p>
                  <p className="text-sm text-stone-400">Sessions today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-900/50 border-stone-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Flame className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{getTodayFocusTime()}</p>
                  <p className="text-sm text-stone-400">Min focused</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions until long break indicator */}
        <Card className="bg-stone-900/50 border-stone-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-stone-400">Next long break</span>
              <span className="text-sm font-medium">
                {completedSessions % settings.sessionsUntilLongBreak}/
                {settings.sessionsUntilLongBreak}
              </span>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: settings.sessionsUntilLongBreak }).map(
                (_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${
                      i < completedSessions % settings.sessionsUntilLongBreak ||
                      (completedSessions > 0 &&
                        completedSessions % settings.sessionsUntilLongBreak ===
                          0 &&
                        i < settings.sessionsUntilLongBreak)
                        ? "bg-orange-500"
                        : "bg-stone-700"
                    }`}
                  />
                ),
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Sessions */}
        {todaySessions.length > 0 && (
          <Card className="bg-stone-900/50 border-stone-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Today's Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todaySessions
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((s) => {
                    const info = getModeInfo(s.mode);
                    const Icon = info.icon;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded ${info.bgColor}`}>
                            <Icon className={`h-4 w-4 ${info.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{info.label}</p>
                            {s.taskName && (
                              <p className="text-xs text-stone-400">
                                {s.taskName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{s.duration} min</p>
                          <p className="text-xs text-stone-400">
                            {new Date(s.completedAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-stone-900 border-stone-800">
          <DialogHeader>
            <DialogTitle>Pomodoro Settings</DialogTitle>
            <DialogDescription>
              Customize timer durations and behavior.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Durations */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-stone-300">
                Durations (minutes)
              </h4>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label>Focus</Label>
                  <Input
                    type="number"
                    value={tempSettings.workDuration}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        workDuration: parseInt(e.target.value) || 25,
                      }))
                    }
                    className="w-20 text-center bg-stone-800 border-stone-700"
                    min={1}
                    max={120}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Short break</Label>
                  <Input
                    type="number"
                    value={tempSettings.shortBreakDuration}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        shortBreakDuration: parseInt(e.target.value) || 5,
                      }))
                    }
                    className="w-20 text-center bg-stone-800 border-stone-700"
                    min={1}
                    max={30}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Long break</Label>
                  <Input
                    type="number"
                    value={tempSettings.longBreakDuration}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        longBreakDuration: parseInt(e.target.value) || 15,
                      }))
                    }
                    className="w-20 text-center bg-stone-800 border-stone-700"
                    min={1}
                    max={60}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Sessions until long break</Label>
                  <Input
                    type="number"
                    value={tempSettings.sessionsUntilLongBreak}
                    onChange={(e) =>
                      setTempSettings((prev) => ({
                        ...prev,
                        sessionsUntilLongBreak: parseInt(e.target.value) || 4,
                      }))
                    }
                    className="w-20 text-center bg-stone-800 border-stone-700"
                    min={2}
                    max={10}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-stone-700" />

            {/* Auto-start options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-stone-300">Behavior</h4>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Auto-start breaks</span>
                  <button
                    onClick={() =>
                      setTempSettings((prev) => ({
                        ...prev,
                        autoStartBreaks: !prev.autoStartBreaks,
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors ${
                      tempSettings.autoStartBreaks
                        ? "bg-orange-500"
                        : "bg-stone-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        tempSettings.autoStartBreaks
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Auto-start focus after break</span>
                  <button
                    onClick={() =>
                      setTempSettings((prev) => ({
                        ...prev,
                        autoStartWork: !prev.autoStartWork,
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors ${
                      tempSettings.autoStartWork
                        ? "bg-orange-500"
                        : "bg-stone-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        tempSettings.autoStartWork
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
