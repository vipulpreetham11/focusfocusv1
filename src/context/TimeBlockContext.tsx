"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { TimeBlock } from "@/types/timeBlock";
import { Task } from "@/types/task";
import { useTasks } from "@/context/TaskContext";

interface TimeBlockContextType {
    timeBlocks: TimeBlock[];
    addManualBlock: (block: Omit<TimeBlock, "id" | "source" | "completed">) => void;
    updateBlock: (id: string, updates: Partial<TimeBlock>) => void;
    deleteBlock: (id: string) => void;
    generateSchedule: (date: string) => void;
}

const TimeBlockContext = createContext<TimeBlockContextType | undefined>(undefined);

const STORAGE_KEY = "focusflow_timeblocks";

export function TimeBlockProvider({ children }: { children: ReactNode }) {
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const { tasks } = useTasks();

    // Load from storage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setTimeBlocks(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse time blocks", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to storage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(timeBlocks));
        }
    }, [timeBlocks, isLoaded]);

    const addManualBlock = (blockData: Omit<TimeBlock, "id" | "source" | "completed">) => {
        const newBlock: TimeBlock = {
            ...blockData,
            id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: "manual",
            completed: false,
        };
        setTimeBlocks(prev => [...prev, newBlock]);
    };

    const updateBlock = (id: string, updates: Partial<TimeBlock>) => {
        setTimeBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const deleteBlock = (id: string) => {
        setTimeBlocks(prev => prev.filter(b => b.id !== id));
    };

    const generateSchedule = useCallback((date: string) => {
        // 1. Get manually created blocks for this date
        //    (We persist manual blocks, so we keep them)
        //    "Manual blocks are never overwritten."
        //    So we filter current state for source="manual" on this date.
        //    Wait, we need to ensure we don't lose them when regenerating.

        try {
            setTimeBlocks(prevBlocks => {
                const manualBlocks = prevBlocks.filter(b => b.date === date && b.source === "manual");
                const otherDateBlocks = prevBlocks.filter(b => b.date !== date);

                // 2. Get tasks for this date
                const targetTasks = tasks.filter(t => t.scheduledDate === date);

                const newAutoBlocks: TimeBlock[] = [];
                let currentTime = 6.0; // Start at 6 AM

                // Sort manual blocks to know gaps
                const sortedManual = manualBlocks.sort((a, b) => a.startHour - b.startHour);

                targetTasks.forEach(task => {
                    // Determine duration (default 30 min if null)
                    const durationMinutes = task.estimatedTime || 30;
                    const durationHours = durationMinutes / 60;

                    // Find a slot
                    let placed = false;

                    // Safety break to prevent infinite loops if full
                    let attempts = 0;
                    while (!placed && currentTime < 23.0 && attempts < 50) {
                        attempts++;
                        const potentialEnd = currentTime + durationHours;

                        // Check overlap with any manual block
                        const overlap = sortedManual.find(m => {
                            const mEnd = m.startHour + (m.durationMinutes / 60);
                            return (currentTime < mEnd && potentialEnd > m.startHour);
                        });

                        if (overlap) {
                            // Jump to end of overlapping block
                            currentTime = overlap.startHour + (overlap.durationMinutes / 60);
                        } else {
                            // Found a spot!
                            // Determine source based on task origin
                            let blockSource: "manual" | "ai" | "exam" | "task" = "task";
                            if (task.title.includes("AI Plan") || task.title.includes("[AI]")) {
                                blockSource = "ai";
                            }
                            // Note: Exam tasks should be marked in the task itself or detected differently
                            // For now, regular tasks get "task" source

                            newAutoBlocks.push({
                                id: `auto_${task.id}`,
                                title: task.title,
                                date: date,
                                startHour: currentTime,
                                durationMinutes: durationMinutes,
                                source: blockSource,
                                completed: task.completed,
                                taskId: task.id
                            });
                            currentTime += durationHours;
                            placed = true;
                        }
                    }
                });

                return [...otherDateBlocks, ...manualBlocks, ...newAutoBlocks];
            });
        } catch (e) {
            console.error("Failed to generate schedule:", e);
            // Optionally set an error state here, but for now just prevent crash
            // We do nothing to state, keeping old state is safer than clearing
        }
    }, [tasks]);

    return (
        <TimeBlockContext.Provider value={{ timeBlocks, addManualBlock, updateBlock, deleteBlock, generateSchedule }}>
            {children}
        </TimeBlockContext.Provider>
    );
}

export function useTimeBlocks() {
    const context = useContext(TimeBlockContext);
    if (context === undefined) {
        throw new Error("useTimeBlocks must be used within a TimeBlockProvider");
    }
    return context;
}
