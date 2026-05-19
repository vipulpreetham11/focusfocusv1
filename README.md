# ClassSpace

> AI-native collaborative operating system for classrooms and educational communities.

![Next.js](https://img.shields.io/badge/Next.js-000?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![RBAC](https://img.shields.io/badge/Auth-RBAC-blue)
![AI](https://img.shields.io/badge/AI-Enabled-purple)

---

## Overview

ClassSpace is an AI-powered collaboration and operational platform designed for colleges, classrooms, and student communities.

It replaces chaotic WhatsApp-based communication systems with a structured, intelligent, and scalable platform for:

- Notices & announcements
- Notes sharing
- Anonymous confessions
- Discussions & Q&A
- Polls & engagement
- Student directory
- Events & birthdays
- Moderation workflows
- AI-powered operational insights

Built using modern full-stack architecture with Next.js, Supabase, PostgreSQL, RBAC, and AI-enhanced workflows.

---

# Problem

Traditional classroom communication is fragmented and unorganized.

Important notices get buried inside chats, assignments become difficult to track, discussions disappear in scrolling, and institutions lack operational visibility into student engagement and academic collaboration.

ClassSpace solves this by creating a centralized AI-native operating system for educational communities.

---

# Features

## Student Experience

### 📌 Notices & Alerts
- Structured notice board
- Pinned announcements
- Hot alerts & urgent notifications
- Reactions & comments

### 📁 Notes Repository
- Upload & download notes
- Subject-wise organization
- Search & filters
- Bookmarking system
- File engagement tracking

### 🗣️ Anonymous Confessions
- Fully anonymous posting
- Emoji reactions
- Moderation pipeline
- Trending confession feed

### 💬 Discussion Threads
- Subject-wise discussions
- Nested replies
- Upvotes & engagement
- Community-driven Q&A

### 👥 Student Directory
- Searchable student profiles
- Contribution statistics
- Community leaderboard

### 🎉 Engagement Systems
- Birthdays & celebrations
- Polls & voting
- Meme wall
- Events & reminders

---

# Administrative Controls

## 🔐 Role-Based Access Control (RBAC)
- Admin & student role separation
- Protected workflows
- Moderation permissions
- Secure access layers

## 🛡️ Moderation System
- Approve/reject confessions
- Manage uploads & discussions
- User moderation workflows
- Community governance tools

## 📊 Analytics Dashboard
- Student engagement analytics
- Contribution leaderboards
- Activity insights
- Operational statistics

## 🔔 Operational Alerts
- Hot notifications
- Broadcast announcements
- Critical alerts system

---

# AI Layer

ClassSpace integrates AI-native operational intelligence workflows designed for educational communities.

## AI Features
- AI-generated operational summaries
- Student engagement analysis
- Activity intelligence
- Retrieval-enhanced insights
- AI moderation assistance
- Community trend detection

## AI Architecture

The system uses structured retrieval pipelines to analyze:

- student activity
- academic interactions
- engagement patterns
- community participation
- operational workflows

This enables proactive AI-generated insights for administrators and educational communities.

---

# System Architecture

```text
Next.js Frontend
        ↓
Supabase Auth + PostgreSQL
        ↓
RBAC + Row Level Security
        ↓
Operational Intelligence Layer
        ↓
AI Insights & Retrieval Pipelines
```

---

# Tech Stack

## Frontend
- Next.js
- React
- TypeScript
- TailwindCSS

## Backend
- Supabase
- PostgreSQL
- Row Level Security (RLS)

## Infrastructure
- Vercel
- GitHub Actions

## AI Infrastructure
- Retrieval pipelines
- Context builders
- AI-generated summaries
- Operational intelligence workflows

---

# Screenshots

## Dashboard
<img width="100%" src="./screenshots/dashboard.png"/>

## Notes System
<img width="100%" src="./screenshots/notes.png"/>

## Discussion Threads
<img width="100%" src="./screenshots/discussions.png"/>

## Admin Dashboard
<img width="100%" src="./screenshots/admin.png"/>

---

# Authentication

ClassSpace supports secure authentication using college email SSO/OAuth workflows.

Supported flows:
- Google Workspace
- College Email OAuth
- JWT-based session management
- Secure RBAC authorization

---

# Roadmap

- AI-generated academic insights
- Smart engagement scoring
- AI moderation assistant
- WhatsApp integration
- Attendance intelligence
- Multi-class architecture
- AI-powered operational dashboards
- Voice-enabled workflows

---

# Built For

OpenAI x Outskill AI Builders Hackathon 2026

---

# Local Development

```bash
git clone https://github.com/yourusername/classspace.git

cd classspace

npm install

npm run dev
```

---

# Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

---

# Vision

ClassSpace is designed to evolve from a classroom collaboration platform into a fully AI-native educational operating system that combines communication, academic workflows, community engagement, and operational intelligence into a unified experience.

---

# License

MIT License