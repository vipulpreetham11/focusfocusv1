"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DailyStats {
    date: string; // YYYY-MM-DD
    studySeconds: number;
    tasksCompleted: number;
}

interface ProgressContextType {
    stats: Record<string, DailyStats>;
    streak: number;
    lastStudyDate: string | null;
    addStudyTime: (seconds: number) => void;
    incrementTaskCount: () => void;
    getTodayStats: () => DailyStats;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

const STORAGE_KEY = "focusflow_progress";

const getTodayISO = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export function ProgressProvider({ children }: { children: ReactNode }) {
    const [stats, setStats] = useState<Record<string, DailyStats>>({});
    const [streak, setStreak] = useState(0);
    const [lastStudyDate, setLastStudyDate] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from storage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setStats(parsed.stats || {});
                setStreak(parsed.streak || 0);
                setLastStudyDate(parsed.lastStudyDate || null);

                // Check for missed days and reset streak if needed
                if (parsed.lastStudyDate) {
                    const last = new Date(parsed.lastStudyDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    last.setHours(0, 0, 0, 0);

                    const diffTime = Math.abs(today.getTime() - last.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 1) {
                        // Missed a day
                        setStreak(0);
                    }
                }
            } catch (e) {
                console.error("Failed to parse progress:", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to storage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ stats, streak, lastStudyDate }));
        }
    }, [stats, streak, lastStudyDate, isLoaded]);

    const updateStreak = (todayISO: string) => {
        if (lastStudyDate === todayISO) return; // Already counted today

        if (lastStudyDate) {
            const last = new Date(lastStudyDate);
            const today = new Date(todayISO);
            // Simple check: is last date strictly yesterday?
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const isYesterday = last.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];

            if (isYesterday) {
                setStreak(prev => prev + 1);
            } else {
                setStreak(1); // Reset to 1 (today is day 1)
            }
        } else {
            setStreak(1); // First day ever
        }
        setLastStudyDate(todayISO);
    };

    const addStudyTime = (seconds: number) => {
        const today = getTodayISO();
        setStats(prev => {
            const current = prev[today] || { date: today, studySeconds: 0, tasksCompleted: 0 };
            return {
                ...prev,
                [today]: { ...current, studySeconds: current.studySeconds + seconds }
            };
        });
        updateStreak(today);
    };

    const incrementTaskCount = () => {
        const today = getTodayISO();
        setStats(prev => {
            const current = prev[today] || { date: today, studySeconds: 0, tasksCompleted: 0 };
            return {
                ...prev,
                [today]: { ...current, tasksCompleted: current.tasksCompleted + 1 }
            };
        });
        updateStreak(today);
    };

    const getTodayStats = () => {
        const today = getTodayISO();
        return stats[today] || { date: today, studySeconds: 0, tasksCompleted: 0 };
    };

    return (
        <ProgressContext.Provider value={{ stats, streak, lastStudyDate, addStudyTime, incrementTaskCount, getTodayStats }}>
            {children}
        </ProgressContext.Provider>
    );
}

export function useProgress() {
    const context = useContext(ProgressContext);
    if (!context) throw new Error("useProgress must be used within ProgressProvider");
    return context;
}
