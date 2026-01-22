import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">🎯 Goal Forge</h1>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Forge Your Goals Into Reality
          </h2>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-xl mx-auto">
            Track your goals, build habits, and achieve more with Goal Forge.
            The simple, powerful way to turn your dreams into accomplishments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-colors"
            >
              Start For Free
            </Link>
            <Link
              href="#features"
              className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 text-foreground font-medium rounded-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </main>

      <section
        id="features"
        className="py-12 sm:py-16 border-t border-zinc-200 dark:border-zinc-800"
      >
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-8 sm:mb-12">
            Everything you need to achieve your goals
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-4 sm:p-6">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="font-semibold text-foreground mb-2">
                Goal Tracking
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Create and track goals with milestones, deadlines, and progress
                indicators.
              </p>
            </div>
            <div className="text-center p-4 sm:p-6">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="font-semibold text-foreground mb-2">
                Progress Analytics
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Visualize your progress with charts and insights to stay
                motivated.
              </p>
            </div>
            <div className="text-center p-4 sm:p-6">
              <div className="text-4xl mb-4">🔥</div>
              <h4 className="font-semibold text-foreground mb-2">
                Habit Streaks
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Build lasting habits with streak tracking and daily reminders.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          © 2026 Goal Forge. Built with Next.js, TypeScript, and Better Auth.
        </div>
      </footer>
    </div>
  );
}
