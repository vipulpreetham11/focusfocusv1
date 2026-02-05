export interface Task {
    id: string;
    title: string;
    estimatedTime: number | null; // in minutes, null if not set
    actualTime: number; // in seconds, default 0
    completed: boolean;
    scheduledDate: string; // ISO date string YYYY-MM-DD
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
    return new Date().toISOString().split("T")[0];
}

/**
 * Format estimated time for display
 */
export function formatEstimatedTime(minutes: number | null): string {
    if (minutes === null) return "No time set";
    return `${minutes} min`;
}
