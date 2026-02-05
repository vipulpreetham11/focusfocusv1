"use client";

import { useTasks } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";
import { Task } from "@/types/task";
import styles from "./TaskItem.module.css";

// Format seconds to mm:ss
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface TaskItemProps {
    task: Task;
    showDelete?: boolean;
    compact?: boolean;
}

export function TaskItem({ task, showDelete = true, compact = false }: TaskItemProps) {
    const { toggleComplete, deleteTask, addActualTime } = useTasks();
    const { activeTaskId, isRunning, elapsedSeconds, startTimer, resetTimer } = useTimer();

    const isActive = activeTaskId === task.id;
    const isTimerRunning = isActive && isRunning;

    const handleStartTimer = () => {
        // If there's an active task with elapsed time, save it first
        if (activeTaskId && activeTaskId !== task.id && elapsedSeconds > 0) {
            addActualTime(activeTaskId, elapsedSeconds);
        }
        // Start timer for this task
        startTimer(task.id);
    };

    const handleStopTimer = () => {
        // Add elapsed time to the task's actualTime
        if (elapsedSeconds > 0) {
            addActualTime(task.id, elapsedSeconds);
        }
        // Reset the timer
        resetTimer();
    };

    const handleToggleComplete = () => {
        // If this task is active, save any elapsed time and stop the timer
        if (isActive) {
            if (elapsedSeconds > 0) {
                addActualTime(task.id, elapsedSeconds);
            }
            // Always reset timer when completing an active task
            resetTimer();
        }
        toggleComplete(task.id);
    };

    const handleDelete = () => {
        // Don't allow deleting an active task
        if (isActive) return;
        deleteTask(task.id);
    };

    // Calculate displayed actual time (saved + current session if active)
    const displayedActualTime = task.actualTime + (isActive ? elapsedSeconds : 0);

    if (compact) {
        // Compact version for Dashboard
        return (
            <div className={`${styles.compactItem} ${isActive ? styles.active : ""}`}>
                <button
                    className={`${styles.checkboxSmall} ${task.completed ? styles.checked : ""}`}
                    onClick={handleToggleComplete}
                    aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                    {task.completed && "✓"}
                </button>
                <span className={`${styles.title} ${task.completed ? styles.completedTitle : ""}`}>
                    {task.title}
                </span>
                <span className={styles.time}>{task.estimatedTime} min</span>
                {!task.completed && (
                    isTimerRunning ? (
                        <button className={styles.stopButtonSmall} onClick={handleStopTimer}>
                            ⏹
                        </button>
                    ) : (
                        <button
                            className={styles.startButtonSmall}
                            onClick={handleStartTimer}
                            disabled={activeTaskId !== null && activeTaskId !== task.id}
                        >
                            ▶
                        </button>
                    )
                )}
            </div>
        );
    }

    // Full version for Tasks page
    return (
        <div className={`${styles.taskCard} ${task.completed ? styles.completed : ""} ${isActive ? styles.activeTask : ""}`}>
            <div className={styles.taskHeader}>
                <button
                    className={`${styles.checkbox} ${task.completed ? styles.checked : ""}`}
                    onClick={handleToggleComplete}
                    aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                    {task.completed && "✓"}
                </button>
                <div className={styles.taskInfo}>
                    <h3 className={task.completed ? styles.completedTitle : ""}>{task.title}</h3>
                    <div className={styles.taskMeta}>
                        <span className={styles.duration}>Est: {task.estimatedTime} min</span>
                        <span className={styles.actualTime}>
                            Actual: {formatTime(displayedActualTime)}
                        </span>
                    </div>
                </div>
                <div className={styles.taskActions}>
                    {!task.completed && (
                        isTimerRunning ? (
                            <button className={styles.stopButton} onClick={handleStopTimer}>
                                ⏹ Stop
                            </button>
                        ) : (
                            <button
                                className={styles.startButton}
                                onClick={handleStartTimer}
                                disabled={activeTaskId !== null && activeTaskId !== task.id}
                            >
                                ▶ Start
                            </button>
                        )
                    )}
                    {showDelete && (
                        <button
                            className={styles.deleteButton}
                            onClick={handleDelete}
                            aria-label="Delete task"
                            disabled={isActive}
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
            {isTimerRunning && (
                <div className={styles.timerBar}>
                    <span className={styles.timerLabel}>Timer running:</span>
                    <span className={styles.timerValue}>{formatTime(elapsedSeconds)}</span>
                </div>
            )}
        </div>
    );
}
