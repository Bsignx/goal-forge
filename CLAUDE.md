# CLAUDE.md - Goal Forge

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

Goal Forge is a goal tracking and management application built with modern web technologies.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Linting**: ESLint 9
- **Database**: Supabase (PostgreSQL) - _planned_
- **ORM**: Prisma - _planned_

## React Stack 2026 (Reference)

### Core Foundation

| Layer             | Choice       | Why                                                               |
| ----------------- | ------------ | ----------------------------------------------------------------- |
| **Language**      | TypeScript   | Type safety, better autocomplete, AI tools work better with types |
| **Framework**     | Next.js      | Mature ecosystem, RSC support, battle-tested                      |
| **Styling**       | Tailwind CSS | Utility-first, AI-friendly, scales well                           |
| **UI Components** | shadcn/ui    | Copies into project, no abstraction, AI can edit directly         |

### Data & State

| Layer                | Choice          | Why                                              |
| -------------------- | --------------- | ------------------------------------------------ |
| **Data Fetching**    | TanStack Query  | Caching, background refetch, stale data handling |
| **State Management** | Zustand         | Simple, minimal boilerplate, hook-based API      |
| **Forms**            | React Hook Form | Performant, clean API, integrates with Zod       |
| **Validation**       | Zod             | Largest ecosystem, works with everything         |

### Backend & Database

| Layer             | Choice                      | Why                                                  |
| ----------------- | --------------------------- | ---------------------------------------------------- |
| **Backend**       | Supabase                    | Postgres, auth, storage, real-time, PG Vector for AI |
| **ORM**           | Prisma                      | Schema-first, generated type-safe client             |
| **Type-safe API** | tRPC                        | Full type safety, no REST endpoints to document      |
| **Auth**          | Supabase Auth / Better Auth | Email, social, 2FA, passkeys out of the box          |

### Testing

| Layer                 | Choice                | Why                      |
| --------------------- | --------------------- | ------------------------ |
| **Unit/Integration**  | Vitest                | Fast, ES modules support |
| **Component Testing** | React Testing Library | Test like a user         |
| **E2E Testing**       | Playwright            | Cross-browser, reliable  |

### Extras

| Layer             | Choice                 | Why                                           |
| ----------------- | ---------------------- | --------------------------------------------- |
| **Animation**     | Motion (Framer Motion) | Best React animation library                  |
| **Data Tables**   | TanStack Table         | Headless, typed, sorting/filtering/pagination |
| **Component Dev** | Storybook              | Isolation, visual testing, documentation      |
| **AI Features**   | Vercel AI SDK          | Streaming, tool calling, chat hooks           |

### Our Stack Choices

```
✅ Next.js 16         - Framework (App Router)
✅ TypeScript 5       - Language
✅ Tailwind CSS 4     - Styling
✅ Supabase           - Backend + Database
✅ Prisma             - ORM
✅ Better Auth        - Authentication
⬜ shadcn/ui          - UI Components (to add)
⬜ TanStack Query     - Data Fetching (to add)
⬜ Zustand            - State Management (to add)
⬜ React Hook Form    - Forms (to add)
⬜ Zod                - Validation (to add)
⬜ Vitest             - Testing (to add)
```

### Better Auth Setup

Better Auth provides modern authentication with passkeys, 2FA, organizations, and more.

**Install:**

```bash
npm install better-auth
```

**Configuration (`src/lib/auth.ts`):**

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
```

**Client (`src/lib/auth-client.ts`):**

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

**API Route (`src/app/api/auth/[...all]/route.ts`):**

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

**Environment Variables:**

```env
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### Install Commands (When Ready)

```bash
# UI Components
npx shadcn@latest init

# Data & State
npm install @tanstack/react-query zustand

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom playwright

# Animation (optional)
npm install motion

# Type-safe API (optional)
npm install @trpc/server @trpc/client @trpc/react-query
```

## Project Structure

```
goal-forge/
├── src/
│   └── app/           # Next.js App Router pages and layouts
│       ├── layout.tsx # Root layout
│       ├── page.tsx   # Home page
│       └── globals.css
├── public/            # Static assets
├── prisma/            # Prisma schema and migrations (planned)
└── ...config files
```

## Common Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database (Planned)

### Supabase + Prisma Integration

When setting up Prisma with Supabase:

1. Install dependencies:

   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

2. Configure `prisma/schema.prisma` with Supabase connection string

3. Common Prisma commands:
   - `npx prisma generate` - Generate Prisma Client
   - `npx prisma migrate dev` - Create and apply migrations
   - `npx prisma studio` - Open database GUI
   - `npx prisma db push` - Push schema changes (dev only)

### Environment Variables (Required)

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # For Supabase pooling
```

## Code Style & Conventions

- Use TypeScript strict mode
- Follow Next.js App Router conventions
- Use server components by default, add `"use client"` only when needed
- Keep components in `src/app` or create `src/components` for shared components
- Use Tailwind CSS for styling
- **Mobile-First Design**: Always design for mobile first, then scale up

### Mobile-First Guidelines

All screens must be designed mobile-first. This means:

1. **Start with mobile styles** (no breakpoint prefix)
2. **Add responsive enhancements** using breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`)
3. **Touch-friendly targets**: Buttons/interactive elements minimum 44x44px
4. **Readable text**: Base font size 16px minimum for body text
5. **Adequate spacing**: Use generous padding on mobile (`p-4` minimum)

```tsx
// ✅ Mobile-first approach
<div className="px-4 py-6 md:px-8 md:py-8 lg:px-12">
  <h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
  <button className="w-full py-3 md:w-auto md:px-6">Click me</button>
</div>

// ❌ Desktop-first (avoid)
<div className="px-12 py-8 sm:px-4 sm:py-6">
```

**Breakpoint Reference:**

- Default (no prefix): < 640px (mobile)
- `sm:`: ≥ 640px (large phones, small tablets)
- `md:`: ≥ 768px (tablets)
- `lg:`: ≥ 1024px (laptops)
- `xl:`: ≥ 1280px (desktops)
- `2xl:`: ≥ 1536px (large screens)

## Clean Code Principles

### SOLID Principles

- **Single Responsibility**: Each component/function should do one thing well
- **Open/Closed**: Components open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for their base types
- **Interface Segregation**: Prefer small, specific interfaces over large ones
- **Dependency Inversion**: Depend on abstractions, not concrete implementations

### Design Patterns

- **Repository Pattern**: Abstract database operations behind repository classes

  ```typescript
  // src/lib/repositories/goal.repository.ts
  export class GoalRepository {
    async findById(id: string): Promise<Goal | null> { ... }
    async create(data: CreateGoalInput): Promise<Goal> { ... }
  }
  ```

- **Service Layer**: Business logic separated from controllers/routes

  ```typescript
  // src/lib/services/goal.service.ts
  export class GoalService {
    constructor(private goalRepo: GoalRepository) {}
    async createGoal(userId: string, data: CreateGoalInput) { ... }
  }
  ```

- **Factory Pattern**: For creating complex objects
- **Adapter Pattern**: For integrating external services (Supabase, APIs)

### File Organization

```
src/
├── app/                    # Next.js routes and pages
├── components/
│   ├── ui/                 # Reusable UI primitives (Button, Card, Input)
│   └── features/           # Feature-specific components
├── lib/
│   ├── db/                 # Database client and utilities
│   ├── repositories/       # Data access layer
│   ├── services/           # Business logic layer
│   ├── utils/              # Helper functions
│   └── validations/        # Zod schemas or validators
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
└── constants/              # App-wide constants
```

### Naming Conventions

- **Files**: kebab-case (`goal-card.tsx`, `use-goals.ts`)
- **Components**: PascalCase (`GoalCard`, `GoalList`)
- **Functions/Variables**: camelCase (`createGoal`, `goalList`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_GOALS`, `API_BASE_URL`)
- **Types/Interfaces**: PascalCase with descriptive names (`Goal`, `CreateGoalInput`)

### Function Guidelines

- Keep functions small (< 20 lines ideally)
- Use descriptive names that indicate what the function does
- Limit parameters (max 3, use object for more)
- Return early to avoid deep nesting
- Use pure functions when possible

```typescript
// ❌ Bad
function process(d: any) {
  if (d) {
    if (d.status === "active") {
      // deep nesting...
    }
  }
}

// ✅ Good
function processActiveGoal(goal: Goal): ProcessedGoal {
  if (!goal || goal.status !== "active") {
    return null;
  }
  return transformGoal(goal);
}
```

### Error Handling

- Use custom error classes for domain errors
- Handle errors at appropriate boundaries
- Provide meaningful error messages
- Log errors with context

```typescript
// src/lib/errors.ts
export class GoalNotFoundError extends Error {
  constructor(goalId: string) {
    super(`Goal with ID ${goalId} not found`);
    this.name = "GoalNotFoundError";
  }
}
```

### TypeScript Best Practices

- Avoid `any` - use `unknown` if type is truly unknown
- Use strict null checks
- Define explicit return types for public functions
- Use discriminated unions for state management
- Prefer `type` for unions/primitives, `interface` for objects

```typescript
// Discriminated union for async state
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };
```

## Feature Suggestions

### Core Features (MVP)

- [ ] **User Authentication** - Sign up, login, logout with Supabase Auth
- [ ] **Goal CRUD** - Create, read, update, delete goals
- [ ] **Goal Categories** - Organize goals by category (Health, Career, Finance, etc.)
- [ ] **Progress Tracking** - Track completion percentage for each goal
- [ ] **Due Dates** - Set deadlines with date picker
- [ ] **Priority Levels** - High, Medium, Low priority indicators

### Enhanced Features

- [ ] **Sub-goals/Milestones** - Break down large goals into smaller tasks
- [ ] **Habit Tracking** - Daily/weekly recurring habits linked to goals
- [ ] **Streak Counter** - Track consecutive days of goal activity
- [ ] **Notes & Reflections** - Add notes to goals for context
- [ ] **Tags** - Flexible tagging system for filtering
- [ ] **Search & Filter** - Search goals, filter by status/category/priority

### Visualization & Analytics

- [ ] **Dashboard** - Overview of all goals with progress summary
- [ ] **Progress Charts** - Visual charts showing goal completion over time
- [ ] **Calendar View** - See goals and deadlines on a calendar
- [ ] **Statistics** - Goals completed, average time to complete, success rate
- [ ] **Activity Timeline** - History of goal updates and completions

### Engagement Features

- [ ] **Reminders** - Email/push notifications for upcoming deadlines
- [ ] **Daily Check-in** - Prompt to review and update goals
- [ ] **Motivational Quotes** - Random quotes on dashboard
- [ ] **Achievements/Badges** - Gamification for completing goals
- [ ] **Goal Templates** - Pre-made templates (30-day challenge, SMART goals)

### Social Features (Optional)

- [ ] **Share Goals** - Share progress with friends
- [ ] **Accountability Partners** - Invite someone to track your progress
- [ ] **Public Goals** - Community feed of public goals
- [ ] **Comments & Encouragement** - Get/give support on goals

### Advanced Features

- [ ] **AI Goal Suggestions** - AI-powered goal recommendations
- [ ] **Smart Breakdown** - AI helps break goals into actionable steps
- [ ] **Time Blocking** - Schedule time for working on goals
- [ ] **Integration** - Connect with Google Calendar, Notion, etc.
- [ ] **Export Data** - Export goals to CSV/PDF
- [ ] **Dark Mode** - Theme toggle

### Data Models (Prisma Schema Preview)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  goals     Goal[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Goal {
  id          String      @id @default(cuid())
  title       String
  description String?
  status      GoalStatus  @default(NOT_STARTED)
  priority    Priority    @default(MEDIUM)
  progress    Int         @default(0) // 0-100
  dueDate     DateTime?
  category    Category?   @relation(fields: [categoryId], references: [id])
  categoryId  String?
  user        User        @relation(fields: [userId], references: [id])
  userId      String
  milestones  Milestone[]
  tags        Tag[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Milestone {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  goal      Goal     @relation(fields: [goalId], references: [id])
  goalId    String
  order     Int
}

model Category {
  id    String @id @default(cuid())
  name  String
  color String
  icon  String?
  goals Goal[]
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  goals Goal[]
}

enum GoalStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  ABANDONED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

### Suggested Implementation Order

1. **Phase 1**: Auth + Basic Goal CRUD + Categories
2. **Phase 2**: Progress tracking + Milestones + Due dates
3. **Phase 3**: Dashboard + Charts + Statistics
4. **Phase 4**: Reminders + Habits + Streaks
5. **Phase 5**: Social features + AI enhancements

## Architecture Guidelines

- **Server Components**: Default for data fetching and static content
- **Client Components**: Only for interactivity (forms, state, effects)
- **API Routes**: Place in `src/app/api/` for backend logic
- **Database Access**: Use Prisma Client in server components/API routes only

## Notes

- This project uses Next.js App Router (not Pages Router)
- React 19 with new features available
- Tailwind CSS 4 with updated configuration
