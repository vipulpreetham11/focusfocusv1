import { Task, getTodayISO } from "@/types/task";

/**
 * Group tasks by date for the current week (Monday to Sunday)
 */
export function getWeeklyTasks(tasks: Task[]): { date: string; dayName: string; tasks: Task[]; isToday: boolean }[] {
    const today = new Date();
    // Monday = 1, Sunday = 7
    // getDay() returns 0 for Sunday
    const currentDay = today.getDay() || 7;

    // Get closest Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);

    const weekData = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const todayISO = getTodayISO();

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        const dateString = date.toISOString().split("T")[0];

        // Find tasks for this date
        const dayTasks = tasks.filter(t => t.scheduledDate === dateString);

        weekData.push({
            date: dateString,
            dayName: dayNames[i],
            tasks: dayTasks,
            isToday: dateString === todayISO
        });
    }

    return weekData;
}
