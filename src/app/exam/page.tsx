"use client";

import { useState } from "react";
import { useExam } from "@/context/ExamContext";
import styles from "./page.module.css";
import { Subject } from "@/types/exam";
import { analyzeChapterWithAI } from "@/lib/ollamaService";


import { useTasks } from "@/context/TaskContext";

export default function ExamPage() {
    const { exam, createExam, clearExam, updateExam, generateStudyPlan, scheduleStudyUnit, autoScheduleExam } = useExam();
    const { tasks } = useTasks();

    // Setup State
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    // Subjects with their chapters
    const [subjects, setSubjects] = useState<{ id: string; name: string; chapters: string[] }[]>([]);

    const [newSubject, setNewSubject] = useState("");
    const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null); // For adding chapters
    const [newChapter, setNewChapter] = useState("");

    const [isGenerating, setIsGenerating] = useState(false);
    const [schedulingUnitId, setSchedulingUnitId] = useState<string | null>(null);
    const [scheduleDate, setScheduleDate] = useState("");

    const handleSchedule = (unitId: string, subjectName: string, unitTitle: string, time: number) => {
        if (!scheduleDate) return;
        scheduleStudyUnit(unitId, subjectName, unitTitle, time, scheduleDate);
        setSchedulingUnitId(null);
        setScheduleDate("");
    };

    // Helper to get unit status
    const getUnitStatus = (unit: any) => {
        if (unit.taskId) {
            const task = tasks.find(t => t.id === unit.taskId);
            if (task) {
                return task.completed ? "completed" : "scheduled";
            }
            // Task might have been deleted?
            return "scheduled"; // Assume scheduled if ID exists, or handle disjoint state
        }
        return "unscheduled";
    };

    const handleAddSubject = () => {
        if (newSubject.trim()) {
            setSubjects([...subjects, { id: `subj_${Date.now()}`, name: newSubject.trim(), chapters: [] }]);
            setNewSubject("");
        }
    };

    const handleAddChapter = (subjectId: string) => {
        if (newChapter.trim()) {
            setSubjects(subjects.map(s => {
                if (s.id === subjectId) {
                    return { ...s, chapters: [...s.chapters, newChapter.trim()] };
                }
                return s;
            }));
            setNewChapter("");
        }
    };

    const handleRemoveSubject = (id: string) => {
        setSubjects(subjects.filter((s) => s.id !== id));
    };

    const handleCreate = async () => {
        if (!name || !date) return;

        setIsGenerating(true);

        // 1. Create basic exam
        createExam(name, date);

        // 2. Add subjects and chapters structure
        // We need to wait a tick for context to update if it were async, but here we can just chain logic 
        // actually createExam is sync state update, but react batching might delay 'exam' availability in context
        // However, generateStudyPlan uses 'exam' from context.
        // So we might need to pass data to generateStudyPlan or updateExam directly.
        // Let's use updateExam immediately after create.

        const formattedSubjects = subjects.map(s => ({
            id: s.id,
            name: s.name,
            chapters: s.chapters.map(cName => ({
                id: `chap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: cName,
                completed: false,
                units: []
            }))
        }));

        updateExam({ subjects: formattedSubjects });

        // 3. Generate Plan (needs the exam state to be updated)
        // Since React state updates are scheduled, 'exam' in context won't be updated yet when generateStudyPlan runs if called immediately.
        // BUT, generateStudyPlan uses 'exam' from context closure.
        // We actually need to wait. OR, we modify generateStudyPlan to accept an exam object.
        // OR we just wait for strict mode to finish.

        // Workaround: We will use a useEffect to trigger generation if we just created it?
        // No, cleaner is to just wait a bit or direct call.
        // Actually, createExam updates state. ensure generateStudyPlan reads LATEST.
        // best way: pass the object to generateStudyPlan?
        // Let's rely on the user seeing a "Generating..." screen and we trigger it in a useEffect or similar?
        // No, let's keep it simple:

        // We will save and then reload page basically. 
        // Actually, we can just call the AI util here directly and then updateExam?
        // YES. That avoids context sync issues.

        try {
            // Deep clone for mutation
            const processedSubjects = JSON.parse(JSON.stringify(formattedSubjects));

            // Loop and generate
            for (const subject of processedSubjects) {
                for (const chapter of subject.chapters) {
                    const units = await analyzeChapterWithAI(subject.name, chapter.name);
                    chapter.units = units.map(u => ({
                        id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        title: u.title,
                        suggestedTime: u.time,
                        completed: false
                    }));
                }
            }

            updateExam({ subjects: processedSubjects });

        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this exam plan?")) {
            clearExam();
            setName("");
            setDate("");
            setSubjects([]);
        }
    };

    if (isGenerating) {
        return (
            <main className={styles.container} style={{ textAlign: "center", paddingTop: "4rem" }}>
                <h1 className={styles.title}>Generating Study Plan...</h1>
                <p className={styles.subtitle}>Analyzing your syllabus with AI. This may take a moment.</p>
                <div className="spinner">⏳</div>
            </main>
        );
    }

    const handleAutoSchedule = () => {
        if (confirm("This will automatically distribute all unscheduled study units across your available study days. Proceed?")) {
            autoScheduleExam();
            // Redirect to dashboard or timetable to see result
            // Since we don't have a router instance here, we can simple use window.location or next/navigation
            // We should use next/navigation
            window.location.href = "/timetable";
        }
    };

    if (exam) {
        // Calculate total minutes
        const totalMinutes = exam.subjects.reduce((acc, sub) => {
            return acc + sub.chapters.reduce((accCp, ch) => {
                return accCp + ch.units.reduce((accU, u) => accU + u.suggestedTime, 0);
            }, 0);
        }, 0);

        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        return (
            <main className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>{exam.name}</h1>
                        <p className="text-muted">
                            Exam Date: {new Date(exam.date).toLocaleDateString()}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleAutoSchedule}
                            title="Automatically distribute unscheduled units"
                        >
                            Auto Schedule Plan ⚡
                        </button>
                        <button className="btn btn-secondary" onClick={clearExam}>
                            Reset Exam
                        </button>
                    </div>
                </div>

                <div className={styles.summaryCard}>
                    <div>
                        <div className={styles.statLabel}>Total Study Time</div>
                        <div className={styles.statValue}>
                            {totalHours}h {remainingMinutes}m
                        </div>
                    </div>
                    <div>
                        <div className={styles.statLabel}>Subjects</div>
                        <div className={styles.statValue}>{exam.subjects.length}</div>
                    </div>
                </div>
                <div className={styles.subjectList}>
                    {exam.subjects.map((subject) => (
                        <div key={subject.id} className={styles.overviewCard}>
                            <div className={styles.subjectTitle}>{subject.name}</div>

                            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {subject.chapters.map(chapter => (
                                    <div key={chapter.id} style={{ paddingLeft: "1rem", borderLeft: "2px solid var(--border)" }}>
                                        <h4 style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                                            {chapter.name}
                                        </h4>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            {chapter.units.map(unit => {
                                                const status = getUnitStatus(unit);
                                                const isScheduled = status === "scheduled";
                                                const isCompleted = status === "completed";

                                                return (
                                                    <div key={unit.id} style={{
                                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                                        fontSize: "0.85rem", padding: "0.75rem",
                                                        background: isCompleted ? "rgba(34, 197, 94, 0.1)" : "var(--background)",
                                                        borderRadius: "6px",
                                                        border: isScheduled ? "1px solid var(--accent)" : "1px solid transparent",
                                                    }}>
                                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                                            <span style={{ textDecoration: isCompleted ? "line-through" : "none" }}>{unit.title}</span>
                                                            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                                                                {unit.suggestedTime}m
                                                                {isScheduled && !isCompleted && " • Scheduled"}
                                                                {isCompleted && " • Done"}
                                                            </span>
                                                        </div>

                                                        <div>
                                                            {status === "unscheduled" && (
                                                                schedulingUnitId === unit.id ? (
                                                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                                                        <input
                                                                            type="date"
                                                                            style={{ padding: "0.2rem", borderRadius: "4px", border: "1px solid var(--border)" }}
                                                                            value={scheduleDate}
                                                                            onChange={(e) => setScheduleDate(e.target.value)}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleSchedule(unit.id, subject.name, unit.title, unit.suggestedTime)}
                                                                            style={{ background: "var(--accent)", color: "white", border: "none", padding: "0.2rem 0.5rem", borderRadius: "4px", cursor: "pointer" }}
                                                                        >
                                                                            Confirm
                                                                        </button>
                                                                        <button onClick={() => setSchedulingUnitId(null)}>✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setSchedulingUnitId(unit.id)}
                                                                        style={{ fontSize: "0.8rem", color: "var(--accent)", background: "transparent", border: "1px solid var(--accent)", padding: "0.2rem 0.5rem", borderRadius: "4px", cursor: "pointer" }}
                                                                    >
                                                                        Schedule
                                                                    </button>
                                                                )
                                                            )}
                                                            {isCompleted && <span style={{ color: "#22c55e" }}>✓</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {exam.subjects.length === 0 && <p className="text-muted">No subjects added.</p>}
                </div>
            </main>
        );
    }

    return (
        <main className={styles.container}>
            <h1 className={styles.title}>Exam Setup</h1>
            <p className={styles.subtitle}>Let&apos;s create a study plan for your upcoming exam.</p>

            <div className={styles.card}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Exam Name</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Final Semester Exams"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Exam Date</label>
                    <input
                        type="date"
                        className={styles.input}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <div className={styles.sectionTitle}>
                    <span>Syllabus Content</span>
                </div>

                <div className={styles.subjectList}>
                    {subjects.map((subject) => (
                        <div key={subject.id} className={styles.subjectItem} style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 600 }}>{subject.name}</span>
                                <button
                                    onClick={() => handleRemoveSubject(subject.id)}
                                    className={styles.iconButton}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Chapters List */}
                            <div style={{ paddingLeft: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                {subject.chapters.map((chap, idx) => (
                                    <div key={idx} style={{ fontSize: "0.9rem", color: "var(--muted)" }}>• {chap}</div>
                                ))}
                            </div>

                            {/* Add Chapter Input */}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                <input
                                    type="text"
                                    placeholder="Add chapter..."
                                    className={styles.input}
                                    style={{ padding: "0.4rem", fontSize: "0.9rem" }}
                                    value={activeSubjectId === subject.id ? newChapter : ""}
                                    onFocus={() => setActiveSubjectId(subject.id)}
                                    onChange={(e) => setNewChapter(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleAddChapter(subject.id);
                                        }
                                    }}
                                />
                                <button
                                    className={styles.iconButton}
                                    style={{ fontSize: "0.8rem", border: "1px solid var(--border)" }}
                                    onClick={() => handleAddChapter(subject.id)}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className={styles.subjectItem} style={{ borderStyle: "dashed", background: "transparent" }}>
                        <input
                            type="text"
                            placeholder="Add new subject..."
                            className={styles.input}
                            style={{ border: "none", padding: 0, background: "transparent", flex: 1 }}
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                        />
                        <button onClick={handleAddSubject} className={styles.iconButton} style={{ color: "var(--accent)" }}>
                            + Add Subject
                        </button>
                    </div>
                </div>

                <button
                    className={styles.createButton}
                    onClick={handleCreate}
                    disabled={!name || !date || subjects.length === 0}
                >
                    Generate AI Study Plan ✨
                </button>
            </div>
        </main>
    );
}
