"use client";

import { useTasks } from "@/context/TaskContext";
import { useTimer } from "@/context/TimerContext";
import { Task } from "@/types/task";
import {
    AIAction,
    AI_ACTIONS,
    CreateTaskAction,
    UpdateTaskAction,
    DeleteTaskAction,
    StartTaskAction,
} from "@/types/aiActions";
import {
    validateAIAction,
    isCreateTaskAction,
    isUpdateTaskAction,
    isDeleteTaskAction,
    isStartTaskAction,
    isPlanDayAction,
} from "@/lib/aiActionValidator";
import { useTimeBlocks } from "@/context/TimeBlockContext";
import { PlanDayAction } from "@/types/aiActions";

/**
 * Result of executing an AI action
 */
export interface ActionExecutionResult {
    success: boolean;
    message: string;
    taskId?: string;
    requiresSelection?: boolean;
    needsTimeInput?: boolean;
    autoStarted?: boolean;
}

/**
 * Custom hook that provides AI action execution capabilities
 */
export function useAIActionExecutor() {
    const { tasks, addTask, updateTask, deleteTask, addActualTime } = useTasks();
    const { activeTaskId, elapsedSeconds, startTimer, resetTimer } = useTimer();
    const { generateSchedule } = useTimeBlocks();

    /**
     * Find a task by title (fuzzy match)
     */
    const findTaskByTitle = (title: string): Task | undefined => {
        const lowerTitle = title.toLowerCase();
        return tasks.find(
            (t) =>
                !t.completed &&
                (t.title.toLowerCase().includes(lowerTitle) ||
                    lowerTitle.includes(t.title.toLowerCase()))
        );
    };

    /**
     * Execute create_task action
     */
    const executeCreateTask = (action: CreateTaskAction): ActionExecutionResult => {
        const newTask = addTask({
            title: action.title,
            estimatedTime: action.estimatedTime, // Can be null
            completed: false,
            scheduledDate: action.date, // Pass the scheduled date (tomorrow if specified)
        });

        const needsTimeInput = action.estimatedTime === null;

        // Auto-start only if explicitly requested AND time is set
        if (action.autoStart && action.estimatedTime !== null) {
            // Save elapsed time from any active task first
            if (activeTaskId && elapsedSeconds > 0) {
                addActualTime(activeTaskId, elapsedSeconds);
            }
            startTimer(newTask.id);

            return {
                success: true,
                message: `Created and started: "${action.title}" (${action.estimatedTime} min)`,
                taskId: newTask.id,
                autoStarted: true,
            };
        }

        if (needsTimeInput) {
            return {
                success: true,
                message: `Created "${action.title}". How much time should I set?`,
                taskId: newTask.id,
                needsTimeInput: true,
            };
        }

        return {
            success: true,
            message: `Created task: "${action.title}" (${action.estimatedTime} min)`,
            taskId: newTask.id,
        };
    };

    /**
     * Execute update_task action
     */
    const executeUpdateTask = (action: UpdateTaskAction): ActionExecutionResult => {
        const task = tasks.find((t) => t.id === action.taskId);

        if (!task) {
            return {
                success: false,
                message: `Task not found with ID: ${action.taskId}`,
            };
        }

        const updates: Partial<Task> = {};
        if (action.title !== undefined) updates.title = action.title;
        if (action.estimatedTime !== undefined) updates.estimatedTime = action.estimatedTime;
        if (action.completed !== undefined) updates.completed = action.completed;

        updateTask(action.taskId, updates);

        return {
            success: true,
            message: `Updated task: "${task.title}"`,
            taskId: action.taskId,
        };
    };

    /**
     * Execute delete_task action
     */
    const executeDeleteTask = (action: DeleteTaskAction): ActionExecutionResult => {
        if (action.taskId === "NEEDS_SELECTION") {
            return {
                success: false,
                message: "Please specify which task to delete.",
                requiresSelection: true,
            };
        }

        const task = tasks.find((t) => t.id === action.taskId);

        if (!task) {
            return {
                success: false,
                message: `Task not found with ID: ${action.taskId}`,
            };
        }

        // Don't allow deleting an active task
        if (activeTaskId === action.taskId) {
            return {
                success: false,
                message: "Cannot delete an active task. Stop the timer first.",
            };
        }

        deleteTask(action.taskId);

        return {
            success: true,
            message: `Deleted task: "${task.title}"`,
            taskId: action.taskId,
        };
    };

    /**
     * Execute start_task action
     */
    const executeStartTask = (action: StartTaskAction): ActionExecutionResult => {
        let targetTask: Task | undefined;

        // Find the task to start
        if (action.taskId) {
            targetTask = tasks.find((t) => t.id === action.taskId && !t.completed);
        } else if (action.taskTitle) {
            targetTask = findTaskByTitle(action.taskTitle);
        } else {
            // No specific task - find the next recommended task
            const pendingTasks = tasks.filter((t) => !t.completed);
            if (pendingTasks.length > 0) {
                // Find task with lowest progress ratio
                targetTask = pendingTasks.reduce((min, t) => {
                    const minRatio = min.estimatedTime ? min.actualTime / (min.estimatedTime * 60) : 0;
                    const tRatio = t.estimatedTime ? t.actualTime / (t.estimatedTime * 60) : 0;
                    return tRatio < minRatio ? t : min;
                }, pendingTasks[0]);
            }
        }

        if (!targetTask) {
            return {
                success: false,
                message: action.taskTitle
                    ? `No pending task found matching: "${action.taskTitle}"`
                    : "No pending tasks available.",
            };
        }

        // Save elapsed time from any active task
        if (activeTaskId && elapsedSeconds > 0) {
            addActualTime(activeTaskId, elapsedSeconds);
        }

        // Start the new task
        startTimer(targetTask.id);

        return {
            success: true,
            message: `Started timer for: "${targetTask.title}"`,
            taskId: targetTask.id,
            autoStarted: true,
        };
    };

    /**
     * Execute plan_day action
     */
    const executePlanDay = (_action: PlanDayAction): ActionExecutionResult => {
        // 1. Get today's date
        const today = new Date().toISOString().split("T")[0];

        // 2. Identify pending tasks
        // We prioritize tasks already scheduled for today, or overdue/pending tasks
        const pendingTasks = tasks.filter((t) => !t.completed);

        if (pendingTasks.length === 0) {
            return {
                success: false,
                message: "No pending tasks to plan! Great job.",
            };
        }

        // 3. Update tasks: ensure they are scheduled for today and have time set
        let updatedCount = 0;
        let firstTaskId: string | null = null;
        let totalMinutes = 0;

        pendingTasks.forEach((task, index) => {
            const updates: Partial<Task> = {};

            // Move to today if not already
            if (task.scheduledDate !== today) {
                updates.scheduledDate = today;
            }

            // Set default time if missing
            if (!task.estimatedTime) {
                updates.estimatedTime = 25; // Default 25 min
            }

            if (Object.keys(updates).length > 0) {
                updateTask(task.id, updates);
                updatedCount++;
            }

            if (index === 0) firstTaskId = task.id;

            // Track total time (use existing or new default)
            totalMinutes += (task.estimatedTime || updates.estimatedTime || 0);
        });

        // 4. Generate Schedule (TimeBlocks) for today
        // This will read the updated tasks (via Context) and arrange them
        // Note: Context updates might be async/batched, but usually sync in React state if we don't await. 
        // However, generateSchedule reads from 'tasks' from useTasks(). 
        // Since we just called updateTask(), the tasks array in this scope is stale, 
        // but generateSchedule uses the *hook's* tasks. 
        // Wait, generateSchedule in TimeBlockContext reads 'tasks' from its own useTasks hook.
        // We need to hope React batching handles this or call it in a way that respects the update.
        // Actually, TimeBlockContext listens to [tasks] in its useEffect to regenerate?
        // Let's check TimeBlockContext.
        // It has `useEffect(() => { ... }, [tasks])`? No, it has `generateSchedule` function.
        // But `generateSchedule` uses `timeBlocks` state setter.
        // It reads `tasks` from `useTasks()`.

        // We will call generateSchedule(today).
        setTimeout(() => generateSchedule(today), 100); // Small delay to ensure task state propagates

        // Format time string
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        // 5. Start the first task
        if (firstTaskId) {
            // Stop current if running
            if (activeTaskId && elapsedSeconds > 0) {
                addActualTime(activeTaskId, elapsedSeconds);
            }
            startTimer(firstTaskId);

            return {
                success: true,
                message: `Planned ${pendingTasks.length} tasks (${timeString}). Starting: "${pendingTasks[0].title}"`,
                taskId: firstTaskId,
                autoStarted: true
            };
        }

        return {
            success: true,
            message: `Day planned! ${pendingTasks.length} tasks scheduled (${timeString}).`,
        };
    };

    /**
     * Set time for a task (after follow-up)
     */
    const setTaskTime = (taskId: string, minutes: number, shouldStart: boolean = false): ActionExecutionResult => {
        const task = tasks.find((t) => t.id === taskId);

        if (!task) {
            return {
                success: false,
                message: "Task not found.",
            };
        }

        updateTask(taskId, { estimatedTime: minutes });

        if (shouldStart) {
            // Save elapsed time from any active task
            if (activeTaskId && elapsedSeconds > 0) {
                addActualTime(activeTaskId, elapsedSeconds);
            }
            startTimer(taskId);

            return {
                success: true,
                message: `Set to ${minutes} min and started timer!`,
                taskId,
                autoStarted: true,
            };
        }

        return {
            success: true,
            message: `Set "${task.title}" to ${minutes} min.`,
            taskId,
        };
    };

    /**
     * Execute an AI action
     * Validates and executes the action, returns a result
     */
    const executeAction = (action: AIAction): ActionExecutionResult => {
        // Validate the action
        const validation = validateAIAction(action);
        if (!validation.valid) {
            return {
                success: false,
                message: `Invalid action: ${validation.error}`,
            };
        }

        // Execute based on action type
        try {
            if (isCreateTaskAction(action)) {
                return executeCreateTask(action);
            }

            if (isUpdateTaskAction(action)) {
                return executeUpdateTask(action);
            }

            if (isDeleteTaskAction(action)) {
                return executeDeleteTask(action);
            }

            if (isStartTaskAction(action)) {
                return executeStartTask(action);
            }

            if (isPlanDayAction(action)) {
                return executePlanDay(action);
            }

            return {
                success: false,
                message: "Unknown action type.",
            };
        } catch (error) {
            console.error("AI Action Execution Error:", error);
            return {
                success: false,
                message: "Something went wrong while executing the action. Please try again.",
            };
        }
    };

    /**
     * Parse JSON string and execute the action
     */
    const executeFromJSON = (jsonString: string): ActionExecutionResult => {
        let action: AIAction;

        try {
            action = JSON.parse(jsonString);
        } catch {
            return {
                success: false,
                message: "Could not parse the response. Please try again.",
            };
        }

        return executeAction(action);
    };

    /**
     * Stop the current timer and save time
     */
    const stopCurrentTimer = (): ActionExecutionResult => {
        if (!activeTaskId) {
            return {
                success: false,
                message: "No timer is currently running.",
            };
        }

        const task = tasks.find((t) => t.id === activeTaskId);

        if (elapsedSeconds > 0) {
            addActualTime(activeTaskId, elapsedSeconds);
        }
        resetTimer();

        return {
            success: true,
            message: task ? `Stopped timer for: "${task.title}"` : "Timer stopped.",
        };
    };

    return {
        executeAction,
        executeFromJSON,
        stopCurrentTimer,
        findTaskByTitle,
        setTaskTime,
    };
}
