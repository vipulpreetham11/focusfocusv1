"use client";

import { useState } from "react";
import { useTasks } from "@/context/TaskContext";
import { TaskItem } from "@/components/TaskItem";
import styles from "./page.module.css";

export default function Tasks() {
    const { tasks, addTask } = useTasks();
    const [title, setTitle] = useState("");
    const [estimatedTime, setEstimatedTime] = useState("");
    const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        addTask({
            title: title.trim(),
            estimatedTime: parseInt(estimatedTime) || 30,
            completed: false,
        });

        // Clear form
        setTitle("");
        setEstimatedTime("");
    };

    const filteredTasks = tasks.filter((task) => {
        if (filter === "pending") return !task.completed;
        if (filter === "completed") return task.completed;
        return true;
    });

    const pendingCount = tasks.filter((t) => !t.completed).length;
    const completedCount = tasks.filter((t) => t.completed).length;

    return (
        <main>
            <div className={styles.header}>
                <h1>Your Tasks</h1>
            </div>
            <p className="text-muted">Manage all your study tasks in one place.</p>

            {/* Add Task Form */}
            <form className={styles.addForm} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <input
                        type="text"
                        placeholder="Task title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={styles.input}
                        required
                    />
                </div>
                <div className={styles.formGroup}>
                    <input
                        type="number"
                        placeholder="Minutes"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        className={styles.inputSmall}
                        min="1"
                        max="480"
                    />
                </div>
                <button type="submit" className={styles.addButton}>
                    + Add Task
                </button>
            </form>

            <div className={styles.filters}>
                <button
                    className={`${styles.filterButton} ${filter === "all" ? styles.active : ""}`}
                    onClick={() => setFilter("all")}
                >
                    All ({tasks.length})
                </button>
                <button
                    className={`${styles.filterButton} ${filter === "pending" ? styles.active : ""}`}
                    onClick={() => setFilter("pending")}
                >
                    Pending ({pendingCount})
                </button>
                <button
                    className={`${styles.filterButton} ${filter === "completed" ? styles.active : ""}`}
                    onClick={() => setFilter("completed")}
                >
                    Completed ({completedCount})
                </button>
            </div>

            <div className={styles.taskList}>
                {filteredTasks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>No tasks yet. Add your first task above!</p>
                    </div>
                ) : (
                    filteredTasks.map((task) => (
                        <TaskItem key={task.id} task={task} showDelete={true} />
                    ))
                )}
            </div>
        </main>
    );
}
