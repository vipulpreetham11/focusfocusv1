
export interface StudyUnit {
    id: string;
    title: string;
    suggestedTime: number; // minutes
    completed: boolean;
    taskId?: string; // Linked task ID
}

export interface Chapter {
    id: string;
    name: string;
    completed: boolean;
    units: StudyUnit[];
}

export interface Subject {
    id: string;
    name: string;
    chapters: Chapter[];
}

export interface Exam {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
    subjects: Subject[];
}
