"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Exam } from "@/types/exam";
import { analyzeChapterWithAI } from "@/lib/ollamaService";
import { useTasks } from "@/context/TaskContext";
import { getAvailableStudyDates, generateDayWisePlan } from "@/lib/taskUtils";

interface ExamContextType {
    exam: Exam | null;
    setExam: (exam: Exam | null) => void;
    createExam: (name: string, date: string) => void;
    clearExam: () => void;
    updateExam: (updates: Partial<Exam>) => void;
    generateStudyPlan: () => Promise<void>;
    scheduleStudyUnit: (unitId: string, subjectName: string, unitTitle: string, suggestedTime: number, date: string) => void;
    autoScheduleExam: () => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

const STORAGE_KEY = "focusflow_exam";

export function ExamProvider({ children }: { children: ReactNode }) {
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load exam from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setExam(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse stored exam:", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save exam to localStorage whenever it changes
    useEffect(() => {
        if (isLoaded) {
            if (exam) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(exam));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, [exam, isLoaded]);

    const createExam = (name: string, date: string) => {
        const newExam: Exam = {
            id: `exam_${Date.now()}`,
            name,
            date,
            subjects: [],
        };
        setExam(newExam);
    };

    const updateExam = (updates: Partial<Exam>) => {
        setExam((prev) => (prev ? { ...prev, ...updates } : null));
    };

    const clearExam = () => {
        setExam(null);
    };

    const generateStudyPlan = async () => {
        if (!exam) return;

        // Deep clone to avoid direct mutation issues
        const updatedSubjects = exam.subjects.map(s => ({
            ...s,
            chapters: s.chapters.map(c => ({ ...c }))
        }));

        let hasChanges = false;

        for (const subject of updatedSubjects) {
            for (const chapter of subject.chapters) {
                // Only generate if no units exist
                if (!chapter.units || chapter.units.length === 0) {
                    try {
                        const units = await analyzeChapterWithAI(subject.name, chapter.name);
                        if (units.length > 0) {
                            chapter.units = units.map(u => ({
                                id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                title: u.title,
                                suggestedTime: u.time,
                                completed: false
                            }));
                            hasChanges = true;
                        }
                    } catch (err) {
                        console.error(`Failed to generate units for ${chapter.name}:`, err);
                    }
                }
            }
        }

        if (hasChanges) {
            updateExam({ subjects: updatedSubjects });
        }
    };

    const { addTask } = useTasks();

    const scheduleStudyUnit = (unitId: string, subjectName: string, unitTitle: string, suggestedTime: number, date: string) => {
        // Create the task
        const newTask = addTask({
            title: `${subjectName}: ${unitTitle}`,
            estimatedTime: suggestedTime,
            scheduledDate: date,
            completed: false,
        });

        // Update the unit with the task ID
        if (exam) {
            const updatedSubjects = exam.subjects.map(s => ({
                ...s,
                chapters: s.chapters.map(c => ({
                    ...c,
                    units: c.units.map(u =>
                        u.id === unitId ? { ...u, taskId: newTask.id } : u
                    )
                }))
            }));
            updateExam({ subjects: updatedSubjects });
        }
    };

    const autoScheduleExam = () => {
        if (!exam) return;

        // 1. Gather all unscheduled units
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unscheduledItems: any[] = [];
        exam.subjects.forEach(s => {
            s.chapters.forEach(c => {
                c.units.forEach(u => {
                    if (!u.taskId && !u.completed) {
                        unscheduledItems.push({
                            unitId: u.id,
                            title: u.title,
                            suggestedTime: u.suggestedTime,
                            subject: s.name,
                            chapter: c.name
                        });
                    }
                });
            });
        });

        if (unscheduledItems.length === 0) return;

        // 2. Get available dates
        const dates = getAvailableStudyDates(exam.date);

        // 3. Distribute units
        const plan = generateDayWisePlan(unscheduledItems, dates);

        // 4. Create tasks and map unit IDs to new Task IDs
        const unitTaskMap: Record<string, string> = {};

        Object.entries(plan).forEach(([date, items]) => {
            items.forEach((item: any) => {
                const newTask = addTask({
                    title: `${item.subject}: ${item.title}`,
                    estimatedTime: item.suggestedTime,
                    scheduledDate: date,
                    completed: false,
                });
                unitTaskMap[item.unitId] = newTask.id;
            });
        });

        // 5. Update Exam State
        const updatedSubjects = exam.subjects.map(s => ({
            ...s,
            chapters: s.chapters.map(c => ({
                ...c,
                units: c.units.map(u =>
                    unitTaskMap[u.id] ? { ...u, taskId: unitTaskMap[u.id] } : u
                )
            }))
        }));

        updateExam({ subjects: updatedSubjects });
    };

    return (
        <ExamContext.Provider value={{ exam, setExam, createExam, clearExam, updateExam, generateStudyPlan, scheduleStudyUnit, autoScheduleExam }}>
            {children}
        </ExamContext.Provider>
    );
}

export function useExam() {
    const context = useContext(ExamContext);
    if (context === undefined) {
        throw new Error("useExam must be used within an ExamProvider");
    }
    return context;
}
