# FocusFlow 🧠⏳

**FocusFlow** is an intelligent, privacy-first study assistant designed to help students overcome procrastination and decision fatigue. By combining smart task management, study timers, and local AI planning, it helps you organize your day effortlessly.

## 🚀 Why FocusFlow?

Students often struggle not with *doing* the work, but with *planning* it. FocusFlow solves this by:
*   **Reducing Decision Fatigue**: The "What should I do now?" button picks your next task for you.
*   **Smart Planning**: Just tell the AI "Plan my day," and it organizes your pending work into a schedule.
*   **Privacy First**: All your data stays on your device. The AI runs locally (via Ollama), so no data ever leaves your computer.

## ✨ Core Features

### 📅 Smart Dashboard
*   **Daily Overview**: See today's tasks, study streak, and total focus time at a glance.
*   **AI Command Bar**: Type naturally (e.g., *"Add math homework for 45 mins"*) to create tasks.
*   **End Day/Reschedule**: Automatically moves unfinished tasks to tomorrow with one click.

### ⏱️ Focus Timer
*   **Track Reality vs. Plan**: Compare estimated time against actual study time.
*   **Distraction-Free**: Simple, clean interface to keep you in the zone.

### 🤖 Smart Day Planner
*   **One-Click Planning**: The AI analyzes your pending tasks and deadlines.
*   **Auto-Scheduling**: Generates a time-blocked schedule in your timetable.
*   **Instant Action**: Automatically starts the timer for the first scheduled task.

### 📊 Progress Tracking
*   **Streaks**: Build consistency with daily study goals.
*   **Analytics**: Visualize your daily focus hours and task completion rates.

## 🛠️ Tech Stack

*   **Framework**: Next.js 14 (React, TypeScript)
*   **Styling**: CSS Modules (Clean, responsive, dark mode)
*   **State Management**: React Context API
*   **Data Persistence**: LocalStorage (Zero setup, offline ready)
*   **AI Engine**: Ollama (Client-side local inference)

## 🏃‍♂️ Getting Started

### Prerequisites
1.  **Node.js** (v18 or higher)
2.  **Ollama**: Download from [ollama.com](https://ollama.com).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/focusflow.git
    cd focusflow
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Setup AI (Ollama):**
    *   Install Ollama and run it.
    *   Pull the Llama 3 model (or any preferred model):
        ```bash
        ollama pull llama3
        ```
    *   Ensure Ollama is running on `http://localhost:11434` (default).

4.  **Run the app:**
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` in your browser.

## 🛡️ Responsible AI Usage

FocusFlow uses AI to **assist**, not replace, your judgment.
*   **Human in the Loop**: The AI suggests plans, but you always have the final say to edit or reject them.
*   **Local Privacy**: We use local LLMs (Ollama) to ensure your personal study data and habits are never uploaded to a cloud server.
*   **Transparent Limits**: The AI is strictly scoped to task management commands to prevent hallucinations or irrelevant outputs.

---
*Built with ❤️ for students.*
