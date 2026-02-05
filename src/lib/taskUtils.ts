import { Task, getTodayISO } from "@/types/task";

/**
 * Calculate the progress ratio for a task
 * ratio = actualTime (seconds) / estimatedTime (converted to seconds)
 * Lower ratio = less progress made = higher priority
 * Returns 0 if estimatedTime is null
 */
export function getProgressRatio(task: Task): number {
    if (task.estimatedTime === null || task.estimatedTime === 0) return 0;
    const estimatedSeconds = task.estimatedTime * 60;
    return task.actualTime / estimatedSeconds;
}

/**
 * Get the next recommended task to work on
 * - Filters out completed tasks
 * - Returns task with lowest progress ratio (least progress made)
 * - Returns null if no pending tasks available
 */
export function getNextTask(tasks: Task[]): Task | null {
    // Filter out completed tasks
    const pendingTasks = tasks.filter((task) => !task.completed);

    // If no pending tasks, return null
    if (pendingTasks.length === 0) {
        return null;
    }

    // Calculate progress ratio for each task and find the minimum
    let nextTask = pendingTasks[0];
    let lowestRatio = getProgressRatio(nextTask);

    for (let i = 1; i < pendingTasks.length; i++) {
        const task = pendingTasks[i];
        const ratio = getProgressRatio(task);

        if (ratio < lowestRatio) {
            lowestRatio = ratio;
            nextTask = task;
        }
    }

    return nextTask;
}

/**
 * Format progress ratio as a percentage string
 */
export function formatProgressPercent(task: Task): string {
    if (task.estimatedTime === null) return "—";
    const ratio = getProgressRatio(task);
    const percent = Math.min(100, Math.round(ratio * 100));
    return `${percent}%`;
}

/**
 * Get tasks scheduled for a specific date
 */
export function getTasksForDate(tasks: Task[], date: string): Task[] {
    return tasks.filter((task) => task.scheduledDate === date);
}

/**
 * Get today's tasks
 */
export function getTodaysTasks(tasks: Task[]): Task[] {
    return getTasksForDate(tasks, getTodayISO());
}

/**
 * Get tomorrow's date in ISO format (YYYY-MM-DD)
 */
export function getTomorrowISO(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
}

/**
 * Find incomplete tasks scheduled for today that should be rescheduled
 */
export function getMissedTasks(tasks: Task[]): Task[] {
    const today = getTodayISO();
    return tasks.filter(
        (task) => task.scheduledDate === today && !task.completed
    );
}

/**
 * Reschedule missed tasks to tomorrow
 * Returns a list of task updates to apply
 */
export function rescheduleMissedTasks(
    tasks: Task[],
    updateTask: (id: string, updates: Partial<Task>) => void
): { count: number; taskTitles: string[] } {
    const tomorrow = getTomorrowISO();
    const missedTasks = getMissedTasks(tasks);

    const taskTitles: string[] = [];

    for (const task of missedTasks) {
        updateTask(task.id, { scheduledDate: tomorrow });
        taskTitles.push(task.title);
    }

    return {
        count: missedTasks.length,
        taskTitles,
    };
}


/**
 * Format estimated time for display
 */
export function formatEstimatedTime(minutes: number | null): string {
    if (minutes === null) return "No time set";
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes} min`;
}

/**
 * Distribute study units evenly across available dates
 * Respects max daily study limit (default 180 mins = 3 hours)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateDayWisePlan(units: any[], availableDates: string[], maxDailyMinutes: number = 180): Record<string, any[]> {
    const plan: Record<string, any[]> = {};

    // Initialize plan for all dates
    availableDates.forEach(date => {
        plan[date] = [];
    });

    if (availableDates.length === 0) return plan;

    let dayIndex = 0;
    let currentDayMinutes = 0;

    units.forEach(unit => {
        // If we are out of days, put everything in the last day
        if (dayIndex >= availableDates.length) {
            dayIndex = availableDates.length - 1;
        }

        const unitTime = unit.suggestedTime || 30;

        // Check if adding this unit exceeds limit
        if (currentDayMinutes + unitTime > maxDailyMinutes && dayIndex < availableDates.length - 1) {
            // Move to next day
            dayIndex++;
            currentDayMinutes = 0;
        }

        const date = availableDates[dayIndex];
        // Safety check if date exists in plan
        if (plan[date]) {
            plan[date].push(unit);
            currentDayMinutes += unitTime;
        }
    });

    return plan;
}

/**
 * Get available study dates between today and exam date
 * Returns array of YYYY-MM-DD strings
 */
export function getAvailableStudyDates(examDateStr: string): string[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const examDate = new Date(examDateStr);
    examDate.setHours(0, 0, 0, 0);

    // If exam is in the past or today, return only today (or empty if strictly future)
    // Assuming we want to study starting today up to the day before exam, or including exam day?
    // Usually one studies up to the exam. Let's include exam date for cramming, or make it configurable. 
    // Prompt says "returning an array of available study dates". 
    // Let's assume inclusive of today, inclusive of exam date.

    if (examDate < today) return [];

    const availableDates: string[] = [];
    const current = new Date(today);

    while (current <= examDate) {
        // Format to YYYY-MM-DD using local time logic
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, "0");
        const day = String(current.getDate()).padStart(2, "0");
        availableDates.push(`${year}-${month}-${day}`);

        current.setDate(current.getDate() + 1);
    }

    return availableDates;
}
