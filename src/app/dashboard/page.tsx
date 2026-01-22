"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type Habit = {
  id: string;
  name: string;
  emoji: string;
  order: number;
  completed: boolean;
};

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✅");

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

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchHabits();
    }
  }, [session, fetchHabits]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const toggleHabit = async (habitId: string) => {
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId ? { ...h, completed: !h.completed } : h,
      ),
    );

    try {
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "POST",
      });
      if (!res.ok) {
        // Revert on error
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId ? { ...h, completed: !h.completed } : h,
          ),
        );
      }
    } catch {
      // Revert on error
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
        body: JSON.stringify({ name: newHabitName, emoji: newHabitEmoji }),
      });
      if (res.ok) {
        setNewHabitName("");
        setNewHabitEmoji("✅");
        setShowAddHabit(false);
        fetchHabits();
      }
    } catch (error) {
      console.error("Failed to add habit:", error);
    }
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const completedCount = habits.filter((h) => h.completed).length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">🎯 Goal Forge</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden sm:block">
              {session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Daily Header */}
        <div className="mb-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Painel do Dia
          </p>
          <h2 className="text-2xl font-bold text-foreground capitalize mt-1">
            {formattedDate}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
            Só hoje. Nada de ontem. Nada de amanhã.
          </p>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              <span>Progresso do dia</span>
              <span>
                {completedCount}/{totalCount} ({Math.round(progress)}%)
              </span>
            </div>
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Habits List */}
        <div className="space-y-3">
          {habits.map((habit) => (
            <button
              key={habit.id}
              onClick={() => toggleHabit(habit.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                habit.completed
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <span className="text-2xl">{habit.emoji}</span>
              <span
                className={`flex-1 text-left font-medium ${
                  habit.completed
                    ? "text-green-700 dark:text-green-400 line-through"
                    : "text-foreground"
                }`}
              >
                {habit.name}
              </span>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  habit.completed
                    ? "bg-green-500 border-green-500"
                    : "border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {habit.completed && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}

          {habits.length === 0 && !showAddHabit && (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <p className="mb-4">Nenhuma atividade cadastrada ainda.</p>
              <p className="text-sm">Clique no botão abaixo para adicionar!</p>
            </div>
          )}
        </div>

        {/* Add Habit Form */}
        {showAddHabit ? (
          <form
            onSubmit={addHabit}
            className="mt-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={newHabitEmoji}
                onChange={(e) => setNewHabitEmoji(e.target.value)}
                className="w-16 px-3 py-2 text-center text-xl border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                placeholder="✅"
              />
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-foreground"
                placeholder="Nome da atividade..."
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddHabit(false);
                  setNewHabitName("");
                  setNewHabitEmoji("✅");
                }}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddHabit(true)}
            className="mt-6 w-full py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            + Adicionar atividade
          </button>
        )}

        {/* Motivational Footer */}
        {completedCount === totalCount && totalCount > 0 && (
          <div className="mt-8 text-center py-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <span className="text-4xl">🎉</span>
            <p className="mt-2 text-green-700 dark:text-green-400 font-medium">
              Parabéns! Você completou todas as atividades de hoje!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
