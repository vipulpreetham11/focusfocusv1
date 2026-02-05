"use client";

import { TaskProvider } from "@/context/TaskContext";
import { TimerProvider } from "@/context/TimerContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ExamProvider } from "@/context/ExamContext";
import { TimeBlockProvider } from "@/context/TimeBlockContext";
import { ProgressProvider } from "@/context/ProgressContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SettingsProvider>
            <ProgressProvider>
                <TaskProvider>
                    <ExamProvider>
                        <TimeBlockProvider>
                            <TimerProvider>{children}</TimerProvider>
                        </TimeBlockProvider>
                    </ExamProvider>
                </TaskProvider>
            </ProgressProvider>
        </SettingsProvider>
    );
}
