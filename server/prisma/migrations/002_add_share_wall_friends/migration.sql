-- Migration: Add share, wall, and friends features
-- Requires: 20260426125536_db_init

-- Add fields to User table
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "lastLogin" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "medals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "consecutiveShares" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastShareDate" TIMESTAMP(3);

-- Add fields to Session table
ALTER TABLE "Session" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Add fields to Story table
ALTER TABLE "Story" ADD COLUMN "interpretation" TEXT;

-- Create ShareLog table
CREATE TABLE "ShareLog" (
    "id" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShareLog_pkey" PRIMARY KEY ("id")
);

-- Create Invite table
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "inviterOpenid" TEXT NOT NULL,
    "inviteeOpenid" TEXT,
    "inviteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invite_inviteCode_key" ON "Invite"("inviteCode");

-- Create Friend table
CREATE TABLE "Friend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Friend_userId_friendId_key" ON "Friend"("userId", "friendId");

-- Create DreamWall table
CREATE TABLE "DreamWall" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar" TEXT,
    "storyTitle" TEXT NOT NULL,
    "storySnippet" TEXT NOT NULL,
    "storyFull" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DreamWall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DreamWall_sessionId_key" ON "DreamWall"("sessionId");
CREATE INDEX "DreamWall_openid_idx" ON "DreamWall"("openid");
CREATE INDEX "DreamWall_status_visibility_idx" ON "DreamWall"("status", "visibility");
CREATE INDEX "DreamWall_isFeatured_createdAt_idx" ON "DreamWall"("isFeatured", "createdAt");
CREATE INDEX "DreamWall_isFeatured_likeCount_createdAt_idx" ON "DreamWall"("isFeatured", "likeCount", "createdAt");

-- Create DreamWallLike table
CREATE TABLE "DreamWallLike" (
    "id" TEXT NOT NULL,
    "wallId" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DreamWallLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DreamWallLike_wallId_openid_key" ON "DreamWallLike"("wallId", "openid");
CREATE INDEX "DreamWallLike_wallId_idx" ON "DreamWallLike"("wallId");

-- Create DreamWallComment table
CREATE TABLE "DreamWallComment" (
    "id" TEXT NOT NULL,
    "wallId" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar" TEXT,
    "content" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DreamWallComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DreamWallComment_wallId_idx" ON "DreamWallComment"("wallId");

-- Add foreign key constraints
ALTER TABLE "ShareLog" ADD CONSTRAINT "ShareLog_openid_fkey" FOREIGN KEY ("openid") REFERENCES "User"("openid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviterOpenid_fkey" FOREIGN KEY ("inviterOpenid") REFERENCES "User"("openid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviteeOpenid_fkey" FOREIGN KEY ("inviteeOpenid") REFERENCES "User"("openid") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DreamWall" ADD CONSTRAINT "DreamWall_openid_fkey" FOREIGN KEY ("openid") REFERENCES "User"("openid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DreamWallLike" ADD CONSTRAINT "DreamWallLike_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "DreamWall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DreamWallLike" ADD CONSTRAINT "DreamWallLike_openid_fkey" FOREIGN KEY ("openid") REFERENCES "User"("openid") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DreamWallComment" ADD CONSTRAINT "DreamWallComment_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "DreamWall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DreamWallComment" ADD CONSTRAINT "DreamWallComment_openid_fkey" FOREIGN KEY ("openid") REFERENCES "User"("openid") ON DELETE RESTRICT ON UPDATE CASCADE;
