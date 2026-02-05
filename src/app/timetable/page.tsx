"use client";

import { useState, useEffect } from "react";
import { useTasks } from "@/context/TaskContext";
import { useTimeBlocks } from "@/context/TimeBlockContext";
import { useTimer } from "@/context/TimerContext";
import { getTasksForDate } from "@/lib/taskUtils";
import { getTodayISO } from "@/types/task";
import styles from "./page.module.css";

export default function Timetable() {
    // Initialize with today's date
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { timeBlocks, generateSchedule, updateBlock } = useTimeBlocks();
    // Timer integration
    const { startTimer, stopTimer, pauseTimer, activeTaskId, isRunning, elapsedSeconds } = useTimer();
    const { tasks, toggleComplete, addActualTime } = useTasks(); // Need tasks to get duration for auto-complete

    // Helper to format time (MM:SS)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Monitor timer for auto-completion
    useEffect(() => {
        if (isRunning && activeTaskId) {
            const currentTask = tasks.find(t => t.id === activeTaskId);
            if (currentTask && currentTask.estimatedTime) {
                const targetSeconds = currentTask.estimatedTime * 60;
                // If we reached the target (buffer of 1s to avoid immediate trigger if started at target)
                if (elapsedSeconds >= targetSeconds && targetSeconds > 0) {
                    addActualTime(activeTaskId, elapsedSeconds);
                    stopTimer();
                    if (!currentTask.completed) {
                        toggleComplete(activeTaskId);
                        // Optional: Play sound or notification here
                    }
                }
            }
        }
    }, [isRunning, activeTaskId, elapsedSeconds, tasks, stopTimer, toggleComplete]);

    const handleStartClick = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation(); // Prevent card click
        startTimer(taskId);
    };

    const handleStopClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        stopTimer();
    };

    // Helper to format date for display (e.g., "Monday, February 3")
    const formatDateDisplay = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
        });
    };

    // Helper to get ISO string for filtering (YYYY-MM-DD) in local time
    const getISO = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Navigation handlers
    const handlePrevDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    const handleToday = () => {
        setSelectedDate(new Date());
    };

    // Filter tasks for selected date
    // Filter blocks for selected date
    const currentDateISO = getISO(selectedDate);

    // Regenerate schedule when date changes (or tasks change - handled by context inner logic mostly, 
    // but explicit call ensures we see updates)
    useEffect(() => {
        generateSchedule(currentDateISO);
    }, [currentDateISO, generateSchedule]);

    const sortedBlocks = timeBlocks
        .filter(b => b.date === currentDateISO)
        .sort((a, b) => a.startHour - b.startHour);

    const formatHour = (decimalHour: number) => {
        const hours = Math.floor(decimalHour);
        const minutes = Math.round((decimalHour - hours) * 60);
        const h = hours % 12 || 12;
        const ampm = hours < 12 ? "AM" : "PM";
        return `${h}:${minutes.toString().padStart(2, "0")} is ${ampm}`;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBlockClick = (block: any) => {
        if (block.taskId) {
            // It's a task-linked block (Exam/AI)
            toggleComplete(block.taskId);
            // We rely on context update to refresh the block state via generateSchedule
        } else {
            // It's a manual block
            updateBlock(block.id, { completed: !block.completed });
        }
    };

    return (
        <main>
            <div className={styles.header}>
                <h1>Daily Timetable</h1>
                {/* ... navigation ... */}
                <div className={styles.dateNav}>
                    <button className={styles.navButton} onClick={handlePrevDay}>← Previous Day</button>
                    <span className={styles.currentDate}>{formatDateDisplay(selectedDate)}</span>
                    <button className={styles.navButton} onClick={handleNextDay}>Next Day →</button>
                </div>
                {getISO(new Date()) !== currentDateISO && (
                    <button className={styles.todayButton} onClick={handleToday}>Jump to Today</button>
                )}
            </div>

            <p className="text-muted">Your scheduled study tasks for this day.</p>

            {/* Simple List View */}
            {sortedBlocks.length > 0 ? (
                <div className={styles.timeBlockList}>
                    {sortedBlocks.map(block => {
                        const isActive = activeTaskId === block.taskId;
                        const isLinkedTask = !!block.taskId;

                        const handleToggleComplete = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleBlockClick(block);
                        };

                        return (
                            <div
                                key={block.id}
                                className={`${styles.timeBlockCard} ${block.source === 'manual' ? styles.manualCard :
                                    block.source === 'exam' ? styles.examCard :
                                        block.source === 'ai' ? styles.aiCard :
                                            styles.taskCard
                                    } ${block.completed ? styles.completedCard : ""}`}
                            >
                                <div className={styles.cardHeader}>
                                    {/* Time display removed per user request */}
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {/* Timer State or Start Button */}
                                        {isLinkedTask && !block.completed && (
                                            isActive && isRunning ? (
                                                <span className={styles.activeTimerBadge}>
                                                    Running: {formatTime(elapsedSeconds)}
                                                </span>
                                            ) : (
                                                <button
                                                    className={styles.startButton}
                                                    onClick={(e) => block.taskId && handleStartClick(e, block.taskId)}
                                                >
                                                    Start
                                                </button>
                                            )
                                        )}
                                        {/* Done button to mark complete */}
                                        {!block.completed && (
                                            <button
                                                className={styles.startButton}
                                                onClick={handleToggleComplete}
                                                style={{ background: '#22c55e' }}
                                            >
                                                Done
                                            </button>
                                        )}
                                        <span className={styles.blockSource}>{block.source}</span>
                                    </div>
                                </div>
                                <div className={styles.blockTitle}>{block.title}</div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p>No study blocks scheduled for this day.</p>
                </div>
            )}
        </main>
    );
}
