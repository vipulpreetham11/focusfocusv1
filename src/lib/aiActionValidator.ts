import {
    AIAction,
    AI_ACTIONS,
    CreateTaskAction,
    UpdateTaskAction,
    DeleteTaskAction,
    StartTaskAction,
    PlanDayAction,
    AIActionType,
} from "@/types/aiActions";

/**
 * Validation result type
 */
interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Type guard: Check if value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard: Check if value is a positive number or null
 */
function isPositiveNumberOrNull(value: unknown): value is number | null {
    if (value === null) return true;
    return typeof value === "number" && value > 0 && isFinite(value);
}

/**
 * Type guard: Check if value is a valid time string (HH:MM)
 */
function isValidTimeString(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value);
}

/**
 * Type guard: Check if value is a valid date string (YYYY-MM-DD)
 */
function isValidDateString(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
}

/**
 * Validate CreateTaskAction
 */
function validateCreateTask(action: unknown): ValidationResult {
    const a = action as CreateTaskAction;

    if (!isNonEmptyString(a.title)) {
        return { valid: false, error: "title is required and must be a non-empty string" };
    }

    // estimatedTime can be null or a positive number
    if (a.estimatedTime !== undefined && !isPositiveNumberOrNull(a.estimatedTime)) {
        return { valid: false, error: "estimatedTime must be a positive number or null" };
    }

    if (a.date !== undefined && !isValidDateString(a.date)) {
        return { valid: false, error: "date must be in YYYY-MM-DD format" };
    }

    if (a.startTime !== undefined && !isValidTimeString(a.startTime)) {
        return { valid: false, error: "startTime must be in HH:MM format" };
    }

    return { valid: true };
}

/**
 * Validate UpdateTaskAction
 */
function validateUpdateTask(action: unknown): ValidationResult {
    const a = action as UpdateTaskAction;

    if (!isNonEmptyString(a.taskId)) {
        return { valid: false, error: "taskId is required and must be a non-empty string" };
    }

    // At least one update field must be provided
    const hasUpdate =
        a.title !== undefined ||
        a.estimatedTime !== undefined ||
        a.completed !== undefined ||
        a.date !== undefined ||
        a.startTime !== undefined;

    if (!hasUpdate) {
        return { valid: false, error: "At least one field to update must be provided" };
    }

    if (a.title !== undefined && !isNonEmptyString(a.title)) {
        return { valid: false, error: "title must be a non-empty string" };
    }

    if (a.estimatedTime !== undefined && !isPositiveNumberOrNull(a.estimatedTime)) {
        return { valid: false, error: "estimatedTime must be a positive number or null" };
    }

    if (a.completed !== undefined && typeof a.completed !== "boolean") {
        return { valid: false, error: "completed must be a boolean" };
    }

    if (a.date !== undefined && !isValidDateString(a.date)) {
        return { valid: false, error: "date must be in YYYY-MM-DD format" };
    }

    if (a.startTime !== undefined && !isValidTimeString(a.startTime)) {
        return { valid: false, error: "startTime must be in HH:MM format" };
    }

    return { valid: true };
}

/**
 * Validate DeleteTaskAction
 */
function validateDeleteTask(action: unknown): ValidationResult {
    const a = action as DeleteTaskAction;

    if (!isNonEmptyString(a.taskId)) {
        return { valid: false, error: "taskId is required and must be a non-empty string" };
    }

    return { valid: true };
}

/**
 * Validate StartTaskAction
 */
function validateStartTask(action: unknown): ValidationResult {
    const a = action as StartTaskAction;

    // Either taskId or taskTitle should be provided (or neither for "suggest next")
    if (a.taskId !== undefined && !isNonEmptyString(a.taskId)) {
        return { valid: false, error: "taskId must be a non-empty string" };
    }

    if (a.taskTitle !== undefined && !isNonEmptyString(a.taskTitle)) {
        return { valid: false, error: "taskTitle must be a non-empty string" };
    }

    return { valid: true };
}

/**
 * Check if action type is valid
 */
function isValidActionType(action: unknown): action is { action: AIActionType } {
    if (typeof action !== "object" || action === null) return false;
    const a = action as { action?: unknown };
    return (
        typeof a.action === "string" &&
        Object.values(AI_ACTIONS).includes(a.action as AIActionType)
    );
}

/**
 * Validate an AI action object
 * Returns a validation result with success status and optional error message
 */
export function validateAIAction(action: unknown): ValidationResult {
    if (typeof action !== "object" || action === null) {
        return { valid: false, error: "Action must be an object" };
    }

    if (!isValidActionType(action)) {
        return {
            valid: false,
            error: `Invalid action type. Must be one of: ${Object.values(AI_ACTIONS).join(", ")}`,
        };
    }

    const a = action as AIAction;

    switch (a.action) {
        case AI_ACTIONS.CREATE_TASK:
            return validateCreateTask(action);
        case AI_ACTIONS.UPDATE_TASK:
            return validateUpdateTask(action);
        case AI_ACTIONS.DELETE_TASK:
            return validateDeleteTask(action);
        case AI_ACTIONS.START_TASK:
            return validateStartTask(action);
        case AI_ACTIONS.PLAN_DAY:
            return { valid: true };
        default:
            return { valid: false, error: "Unknown action type" };
    }
}

/**
 * Parse and validate a JSON string into an AI action
 */
export function parseAICommand(jsonString: string): {
    success: boolean;
    action: AIAction | null;
    error?: string;
} {
    let parsed: unknown;

    try {
        parsed = JSON.parse(jsonString);
    } catch {
        return {
            success: false,
            action: null,
            error: "Invalid JSON format",
        };
    }

    const validation = validateAIAction(parsed);

    if (!validation.valid) {
        return {
            success: false,
            action: null,
            error: validation.error,
        };
    }

    return {
        success: true,
        action: parsed as AIAction,
    };
}

/**
 * Type guards for specific action types
 */
export function isCreateTaskAction(action: AIAction): action is CreateTaskAction {
    return action.action === AI_ACTIONS.CREATE_TASK;
}

export function isUpdateTaskAction(action: AIAction): action is UpdateTaskAction {
    return action.action === AI_ACTIONS.UPDATE_TASK;
}

export function isDeleteTaskAction(action: AIAction): action is DeleteTaskAction {
    return action.action === AI_ACTIONS.DELETE_TASK;
}

export function isStartTaskAction(action: AIAction): action is StartTaskAction {
    return action.action === AI_ACTIONS.START_TASK;
}

export function isPlanDayAction(action: AIAction): action is PlanDayAction {
    return action.action === AI_ACTIONS.PLAN_DAY;
}
