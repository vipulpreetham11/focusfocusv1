"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Task, getTodayISO } from "@/types/task";

interface TaskContextType {
    tasks: Task[];
    addTask: (task: Omit<Task, "id" | "actualTime" | "scheduledDate"> & { scheduledDate?: string; estimatedTime?: number | null }) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    toggleComplete: (id: string) => void;
    addActualTime: (id: string, seconds: number) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const STORAGE_KEY = "focusflow_tasks";

function generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Migrate old tasks that don't have all fields
function migrateTask(task: Partial<Task>): Task {
    return {
        id: task.id || generateId(),
        title: task.title || "",
        estimatedTime: task.estimatedTime ?? null, // Default to null if not present
        actualTime: task.actualTime ?? 0,
        completed: task.completed || false,
        scheduledDate: task.scheduledDate || getTodayISO(),
    };
}

import { useProgress } from "@/context/ProgressContext";

export function TaskProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const { addStudyTime, incrementTaskCount } = useProgress();

    // ... existing ...

    // Load tasks from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Migrate old tasks to include all fields
                const migrated = parsed.map(migrateTask);
                setTasks(migrated);
            } catch (e) {
                console.error("Failed to parse stored tasks:", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save tasks to localStorage whenever they change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        }
    }, [tasks, isLoaded]);

    const addTask = (taskData: Omit<Task, "id" | "actualTime" | "scheduledDate"> & { scheduledDate?: string; estimatedTime?: number | null }): Task => {
        const newTask: Task = {
            title: taskData.title,
            completed: taskData.completed,
            id: generateId(),
            actualTime: 0,
            estimatedTime: taskData.estimatedTime ?? null, // Allow null
            scheduledDate: taskData.scheduledDate || getTodayISO(),
        };
        setTasks((prev) => [...prev, newTask]);
        return newTask;
    };

    const updateTask = (id: string, updates: Partial<Task>) => {
        setTasks((prev) =>
            prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
        );
    };

    const deleteTask = (id: string) => {
        setTasks((prev) => prev.filter((task) => task.id !== id));
    };

    const toggleComplete = (id: string) => {
        // Check if task is being completed (not already completed)
        const task = tasks.find(t => t.id === id);
        const isBeingCompleted = task && !task.completed;

        setTasks((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, completed: !t.completed } : t
            )
        );

        // Call incrementTaskCount AFTER setTasks, outside the callback
        if (isBeingCompleted) {
            incrementTaskCount();
        }
    };

    // Add time to a task's actualTime (used by timer)
    const addActualTime = (id: string, seconds: number) => {
        if (seconds > 0) {
            addStudyTime(seconds);
        }
        setTasks((prev) =>
            prev.map((task) =>
                task.id === id
                    ? { ...task, actualTime: task.actualTime + seconds }
                    : task
            )
        );
    };

    return (
        <TaskContext.Provider
            value={{ tasks, addTask, updateTask, deleteTask, toggleComplete, addActualTime }}
        >
            {children}
        </TaskContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error("useTasks must be used within a TaskProvider");
    }
    return context;
}
