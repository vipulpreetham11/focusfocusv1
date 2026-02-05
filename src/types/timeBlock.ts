export interface TimeBlock {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    startHour: number; // 0-23.5 (e.g. 14.5 = 2:30 PM)
    durationMinutes: number;
    source: "manual" | "exam" | "ai" | "task";
    completed: boolean;
    taskId?: string; // Link to original task
    color?: string; // Optional UI color
}

export type TimeBlockSource = TimeBlock["source"];
