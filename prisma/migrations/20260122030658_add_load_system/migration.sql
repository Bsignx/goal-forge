-- CreateEnum
CREATE TYPE "LoadMode" AS ENUM ('FULL', 'RECOVERY', 'MINIMAL');

-- AlterTable
ALTER TABLE "Completion" ADD COLUMN     "mode" "LoadMode" NOT NULL DEFAULT 'FULL';

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "fullDescription" TEXT,
ADD COLUMN     "identityId" TEXT,
ADD COLUMN     "minimalDescription" TEXT,
ADD COLUMN     "recoveryDescription" TEXT;

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎯',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Identity_userId_idx" ON "Identity"("userId");

-- CreateIndex
CREATE INDEX "Habit_identityId_idx" ON "Habit"("identityId");

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
