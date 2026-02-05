/**
 * AI Command Action Types
 * These are the supported actions that can be parsed from natural language.
 */

// Action type constants
export const AI_ACTIONS = {
    CREATE_TASK: "create_task",
    UPDATE_TASK: "update_task",
    DELETE_TASK: "delete_task",
    START_TASK: "start_task",
    PLAN_DAY: "plan_day",
} as const;

export type AIActionType = (typeof AI_ACTIONS)[keyof typeof AI_ACTIONS];

// Create Task Action
export interface CreateTaskAction {
    action: typeof AI_ACTIONS.CREATE_TASK;
    title: string;
    estimatedTime: number | null; // in minutes, null if not specified
    date?: string; // ISO date string (YYYY-MM-DD)
    startTime?: string; // HH:MM format
    autoStart?: boolean; // Whether to auto-start the timer
}

// Update Task Action
export interface UpdateTaskAction {
    action: typeof AI_ACTIONS.UPDATE_TASK;
    taskId: string;
    title?: string;
    estimatedTime?: number | null;
    completed?: boolean;
    date?: string;
    startTime?: string;
}

// Delete Task Action
export interface DeleteTaskAction {
    action: typeof AI_ACTIONS.DELETE_TASK;
    taskId: string;
}

// Start Task Action (start timer)
export interface StartTaskAction {
    action: typeof AI_ACTIONS.START_TASK;
    taskId?: string; // If not provided, suggests next task
    taskTitle?: string; // Alternative: find by title
}

// Plan Day Action
export interface PlanDayAction {
    action: typeof AI_ACTIONS.PLAN_DAY;
}

// Union type for all AI actions
export type AIAction =
    | CreateTaskAction
    | UpdateTaskAction
    | DeleteTaskAction
    | StartTaskAction
    | PlanDayAction;

// AI Command Response wrapper
export interface AICommandResponse {
    success: boolean;
    action: AIAction | null;
    message: string;
    error?: string;
    needsTimeInput?: boolean; // True if task was created without time
    createdTaskId?: string; // ID of created task for follow-up
}
