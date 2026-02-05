"use client";

import { useTasks } from "@/context/TaskContext";
import { getWeeklyTasks } from "@/lib/weeklyUtils";
import { formatEstimatedTime } from "@/lib/taskUtils";
import styles from "./page.module.css";
import { useEffect, useRef } from "react";

export default function WeeklyPage() {
    const { tasks } = useTasks();
    const weekData = getWeeklyTasks(tasks);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to today on mount
    useEffect(() => {
        if (scrollRef.current) {
            const todayCard = scrollRef.current.querySelector(`.${styles.dayCardToday}`);
            if (todayCard) {
                todayCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
        }
    }, []);

    return (
        <main className={styles.container}>
            <div>
                <h1 className={styles.title}>Weekly View</h1>
                <p className={styles.subtitle}>Your productivity at a glance</p>
            </div>

            <div className={styles.weekScroll} ref={scrollRef}>
                {weekData.map((day) => (
                    <div
                        key={day.date}
                        className={`${styles.dayCard} ${day.isToday ? styles.dayCardToday : ""}`}
                    >
                        <div className={styles.dayHeader}>
                            <div className={styles.dayName}>{day.dayName}</div>
                            <div className={styles.date}>
                                {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                        </div>

                        <div className={styles.taskList}>
                            {day.tasks.length === 0 ? (
                                <p className={styles.emptyState}>No tasks</p>
                            ) : (
                                day.tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`${styles.taskItem} ${task.completed ? styles.taskItemCompleted : ""}`}
                                    >
                                        <div className={styles.taskTitle}>{task.title}</div>
                                        {task.estimatedTime && (
                                            <div className={styles.taskTime}>
                                                {formatEstimatedTime(task.estimatedTime)}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
