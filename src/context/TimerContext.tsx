"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface TimerContextType {
    activeTaskId: string | null;
    isRunning: boolean;
    elapsedSeconds: number;
    startTimer: (taskId: string) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => void;
    resetTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Clear interval helper
    const clearTimerInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Increment timer every second when running
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            clearTimerInterval();
        }

        return () => clearTimerInterval();
    }, [isRunning, clearTimerInterval]);

    // Start timer for a specific task
    const startTimer = useCallback((taskId: string) => {
        clearTimerInterval();
        setActiveTaskId(taskId);
        setElapsedSeconds(0);
        setIsRunning(true);
    }, [clearTimerInterval]);

    // Pause the timer (keeps elapsed time)
    const pauseTimer = useCallback(() => {
        setIsRunning(false);
    }, []);

    // Resume the timer
    const resumeTimer = useCallback(() => {
        if (activeTaskId) {
            setIsRunning(true);
        }
    }, [activeTaskId]);

    // Stop timer and clear task (keeps elapsed for reference)
    const stopTimer = useCallback(() => {
        setIsRunning(false);
        clearTimerInterval();
    }, [clearTimerInterval]);

    // Reset everything
    const resetTimer = useCallback(() => {
        setIsRunning(false);
        setActiveTaskId(null);
        setElapsedSeconds(0);
        clearTimerInterval();
    }, [clearTimerInterval]);

    return (
        <TimerContext.Provider
            value={{
                activeTaskId,
                isRunning,
                elapsedSeconds,
                startTimer,
                pauseTimer,
                resumeTimer,
                stopTimer,
                resetTimer,
            }}
        >
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error("useTimer must be used within a TimerProvider");
    }
    return context;
}
