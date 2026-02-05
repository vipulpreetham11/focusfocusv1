"use client";

import { useState } from "react";
import { useTasks } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";
import { useProgress } from "@/context/ProgressContext";
import { useSettings } from "@/context/SettingsContext";
import { TaskItem } from "@/components/TaskItem";
import { getNextTask, getTodaysTasks, rescheduleMissedTasks, formatEstimatedTime } from "@/lib/taskUtils";
import { parseUserInputWithOllama } from "@/lib/ollamaService";
import { useAIActionExecutor } from "@/hooks/useAIActionExecutor";
import styles from "./page.module.css";

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Quick time options for follow-up
const TIME_OPTIONS = [
  { label: "25 min", value: 25 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];

export default function Dashboard() {
  const { tasks, addActualTime, updateTask } = useTasks();
  const { activeTaskId, isRunning, elapsedSeconds, startTimer, pauseTimer, resumeTimer, resetTimer } = useTimer();
  const { executeAction, stopCurrentTimer, setTaskTime } = useAIActionExecutor();
  const { streak, getTodayStats } = useProgress();

  const todayStats = getTodayStats();

  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [aiInput, setAIInput] = useState("");
  const [aiResponse, setAIResponse] = useState<{ message: string; success: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [endDayMessage, setEndDayMessage] = useState<string | null>(null);

  // Follow-up state for time selection
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [showTimeOptions, setShowTimeOptions] = useState(false);

  // Find the active task
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  // Get today's tasks only (filtered by scheduledDate)
  const todaysTasks = getTodaysTasks(tasks);
  const pendingTasks = todaysTasks.filter((t) => !t.completed);
  const completedTasks = todaysTasks.filter((t) => t.completed);

  // Handle stopping the active timer
  const handleStopTimer = () => {
    if (activeTaskId && elapsedSeconds > 0) {
      addActualTime(activeTaskId, elapsedSeconds);
    }
    resetTimer();
    setSuggestionMessage(null);
  };

  // Handle "End Day" button - reschedule missed tasks to tomorrow
  const handleEndDay = () => {
    // First, stop any running timer
    if (activeTaskId && elapsedSeconds > 0) {
      addActualTime(activeTaskId, elapsedSeconds);
    }
    resetTimer();

    // Reschedule incomplete tasks
    const { count } = rescheduleMissedTasks(tasks, updateTask);

    if (count > 0) {
      setEndDayMessage(`${count} unfinished task${count > 1 ? "s" : ""} moved to tomorrow 😊`);
    } else {
      setEndDayMessage("All done for today! Great work 🎉");
    }

    // Clear message after 6 seconds
    setTimeout(() => setEndDayMessage(null), 6000);
  };

  // Handle "What should I do now?" button
  const handleSuggestion = () => {
    const nextTask = getNextTask(tasks);

    // Edge case: All tasks are completed
    if (!nextTask) {
      if (activeTaskId && elapsedSeconds > 0) {
        addActualTime(activeTaskId, elapsedSeconds);
        resetTimer();
      }
      setSuggestionMessage("You're done for now 🎉");
      return;
    }

    // Timer running - save elapsed time first
    if (activeTaskId && elapsedSeconds > 0) {
      addActualTime(activeTaskId, elapsedSeconds);
    }

    // Start the suggested task
    startTimer(nextTask.id);
    setSuggestionMessage(`Let's work on: ${nextTask.title}`);

    // Clear message after 5 seconds
    setTimeout(() => setSuggestionMessage(null), 5000);
  };

  // Handle time option selection (follow-up)
  const handleTimeSelect = (minutes: number, shouldStart: boolean = false) => {
    if (!pendingTaskId) return;

    const result = setTaskTime(pendingTaskId, minutes, shouldStart);
    setAIResponse({ message: result.message, success: result.success });
    setPendingTaskId(null);
    setShowTimeOptions(false);

    // Clear response after 5 seconds
    setTimeout(() => setAIResponse(null), 5000);
  };

  // Handle dismissing time options
  const handleDismissTimeOptions = () => {
    setPendingTaskId(null);
    setShowTimeOptions(false);
    setAIResponse(null);
  };

  // Handle AI command submission
  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isProcessing) return;

    setIsProcessing(true);
    setAIResponse(null);
    setPendingTaskId(null);
    setShowTimeOptions(false);

    try {
      // Parse the user input using Ollama AI
      const parseResult = await parseUserInputWithOllama(aiInput);

      if (!parseResult.success || !parseResult.action) {
        // Check if this is a stop command
        if (aiInput.toLowerCase().includes("stop") || aiInput.toLowerCase().includes("pause")) {
          const stopResult = stopCurrentTimer();
          setAIResponse({ message: stopResult.message, success: stopResult.success });
        } else {
          setAIResponse({
            message: parseResult.message || "I didn't understand that. Try again.",
            success: false
          });
        }
      } else {
        // Execute the parsed action
        const result = executeAction(parseResult.action);
        setAIResponse({ message: result.message, success: result.success });

        // Check if we need time input (follow-up flow)
        if (result.needsTimeInput && result.taskId) {
          setPendingTaskId(result.taskId);
          setShowTimeOptions(true);
        }
      }

      // Clear input on success
      if (parseResult.success) {
        setAIInput("");
      }
    } catch (error) {
      setAIResponse({
        message: "Something went wrong. Please try again.",
        success: false
      });
      console.error("AI processing error:", error);
    } finally {
      setIsProcessing(false);
      // Only clear response if no time options shown
      if (!showTimeOptions) {
        setTimeout(() => setAIResponse(null), 5000);
      }
    }
  };

  const { name } = useSettings();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div>
          <h1>{getGreeting()}, {name || "Student"}</h1>
          <p className="text-muted">Welcome back! Here&apos;s your study overview for today.</p>
        </div>
        <div className={styles.streakBadge}>
          <span className={styles.streakIcon}>🔥</span>
          <span className={styles.streakCount}>{streak}</span>
          <span className={styles.streakLabel}>Day Streak</span>
        </div>
      </div>

      {/* Progress Summary Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatTime(todayStats.studySeconds)}</span>
          <span className={styles.statLabel}>Study Time</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{completedTasks.length}</span>
          <span className={styles.statLabel}>Tasks Done</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{Math.round(todayStats.studySeconds / 60)}</span>
          <span className={styles.statLabel}>Minutes Focus</span>
        </div>
      </div>

      {/* AI Assistant Input */}
      <section className={styles.aiSection}>
        <form onSubmit={handleAISubmit} className={styles.aiForm}>
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAIInput(e.target.value)}
            placeholder="Try: 'Add homework for 30 minutes' or 'Start studying math'"
            className={styles.aiInput}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className={styles.aiSubmit}
            disabled={isProcessing || !aiInput.trim()}
          >
            {isProcessing ? "..." : "→"}
          </button>
        </form>
        {aiResponse && (
          <p className={`${styles.aiResponse} ${aiResponse.success ? styles.aiSuccess : styles.aiError}`}>
            {aiResponse.message}
          </p>
        )}

        {/* Time Selection Options (Follow-up) */}
        {showTimeOptions && pendingTaskId && (
          <div className={styles.timeOptions}>
            <p className={styles.timeOptionsLabel}>How much time should I set?</p>
            <div className={styles.timeOptionsButtons}>
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={styles.timeOptionButton}
                  onClick={() => handleTimeSelect(opt.value, false)}
                >
                  {opt.label}
                </button>
              ))}
              <button
                className={styles.timeOptionButtonStart}
                onClick={() => handleTimeSelect(25, true)}
              >
                25 min & Start
              </button>
            </div>
            <button className={styles.timeOptionsDismiss} onClick={handleDismissTimeOptions}>
              Skip for now
            </button>
          </div>
        )}
      </section>

      <div className={styles.grid}>
        {/* Study Timer Section */}
        <section className={styles.card}>
          <h2>Study Timer</h2>
          <div className={styles.timer}>
            <div className={styles.timerDisplay}>{formatTime(elapsedSeconds)}</div>
            <p className={styles.timerTask}>
              {activeTask ? activeTask.title : "No active task"}
            </p>
            <div className={styles.timerControls}>
              {activeTask ? (
                <>
                  {isRunning ? (
                    <button className={styles.timerButtonSecondary} onClick={pauseTimer}>
                      Pause
                    </button>
                  ) : (
                    <button className={styles.timerButton} onClick={resumeTimer}>
                      Resume
                    </button>
                  )}
                  <button className={styles.timerButtonDanger} onClick={handleStopTimer}>
                    Stop
                  </button>
                </>
              ) : (
                <>
                  <button className={styles.timerButton} disabled>
                    Start
                  </button>
                  <button className={styles.timerButtonSecondary} disabled>
                    Reset
                  </button>
                </>
              )}
            </div>
            {activeTask && (
              <p className={styles.timerHint}>
                Estimated: {formatEstimatedTime(activeTask.estimatedTime)} •
                Recorded: {formatTime(activeTask.actualTime)}
              </p>
            )}
          </div>
        </section>

        {/* Today's Tasks Section */}
        <section className={styles.card}>
          <h2>Today&apos;s Tasks</h2>
          {todaysTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No tasks scheduled for today.</p>
            </div>
          ) : (
            <div className={styles.taskList}>
              {/* Show pending tasks first, then completed */}
              {pendingTasks.slice(0, 4).map((task) => (
                <TaskItem key={task.id} task={task} showDelete={false} compact={true} />
              ))}
              {completedTasks.slice(0, 3).map((task) => (
                <TaskItem key={task.id} task={task} showDelete={false} compact={true} />
              ))}
              {todaysTasks.length > 7 && (
                <p className={styles.moreTasksHint}>+ {todaysTasks.length - 7} more tasks</p>
              )}
            </div>
          )}
          <p className={styles.cardFooter}>
            {pendingTasks.length} pending • {completedTasks.length} completed today
          </p>
        </section>
      </div>

      {/* What Should I Do Now Section */}
      <section className={styles.suggestionSection}>
        <button className={styles.suggestionButton} onClick={handleSuggestion}>
          <span className={styles.suggestionIcon}>✨</span>
          What should I do now?
        </button>
        {suggestionMessage ? (
          <p className={styles.suggestionResult}>{suggestionMessage}</p>
        ) : (
          <p className={styles.suggestionHint}>Get a smart suggestion for your next task</p>
        )}
      </section>

      {/* End Day Section */}
      <section className={styles.endDaySection}>
        <button className={styles.endDayButton} onClick={handleEndDay}>
          🌙 End Day
        </button>
        {endDayMessage && (
          <p className={styles.endDayMessage}>{endDayMessage}</p>
        )}
      </section>
    </main>
  );
}
