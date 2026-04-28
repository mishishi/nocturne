# Story Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user feedback mechanism after story reading to collect satisfaction and element matching ratings

**Architecture:** Feedback form appears after user scrolls to bottom of story. Data stored in new StoryFeedback table.

**Tech Stack:** React, Express, Prisma, PostgreSQL

---

## Task 1: Database Migration - Add StoryFeedback Model

- Modify: server/prisma/schema.prisma
- Add StoryFeedback model
- Run: cd server && npx prisma migrate dev --name add_story_feedback

## Task 2: Backend API - Story Feedback Endpoint

- Create: server/src/routes/storyFeedback.js
- POST /api/story-feedback endpoint

## Task 3: Frontend API - Add submitStoryFeedback Function

- Modify: src/services/api.ts - add storyFeedbackApi

## Task 4: Frontend Component - StoryFeedbackForm

- Create: src/components/StoryFeedbackForm.tsx
- Create: src/components/StoryFeedbackForm.module.css
- Star rating with hover, scroll detection, localStorage state

## Task 5: Integration - Add Feedback Form to Story Page

- Modify: src/pages/Story.tsx - import and render form

## Task 6: Test Complete Flow

- Verify form appears at 90% scroll
- Verify submission persistence
