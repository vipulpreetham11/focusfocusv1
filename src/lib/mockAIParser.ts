import {
    AIAction,
    AICommandResponse,
    AI_ACTIONS,
    CreateTaskAction,
    StartTaskAction,
    DeleteTaskAction,
} from "@/types/aiActions";

/**
 * Mock AI Parser
 * 
 * This is a temporary mock function that simulates AI parsing of natural language.
 * It uses simple keyword matching to generate actions.
 * 
 * Replace this with Ollama integration later without changing the interface.
 */

// Keywords that indicate user wants to START immediately
const START_IMMEDIATELY_KEYWORDS = ["start", "begin", "now", "timer", "go"];

// Check if input contains time indication
function hasTimeIndication(text: string): boolean {
    const timePatterns = [
        /\d+\s*(?:hour|hr|h)\b/i,
        /\d+\s*(?:minute|min|m)\b/i,
        /half\s*hour/i,
        /quarter\s*hour/i,
        /from\s*\d+\s*to\s*\d+/i,
        /\d+\s*-\s*\d+/i,
    ];
    return timePatterns.some((pattern) => pattern.test(text));
}

// Extract time duration from text (e.g., "30 minutes", "1 hour", "45 min")
function extractDuration(text: string): number | null {
    const hourMatch = text.match(/(\d+)\s*(?:hour|hr|h)\b/i);
    const minMatch = text.match(/(\d+)\s*(?:minute|min|m)\b/i);
    const rangeMatch = text.match(/from\s*(\d+)\s*to\s*(\d+)/i);

    // Check for time range (e.g., "from 6 to 7")
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        return (end - start) * 60; // Assume hours
    }

    let minutes = 0;
    let hasTime = false;

    if (hourMatch) {
        minutes += parseInt(hourMatch[1]) * 60;
        hasTime = true;
    }
    if (minMatch) {
        minutes += parseInt(minMatch[1]);
        hasTime = true;
    }

    // Only return a value if time was explicitly mentioned
    return hasTime ? minutes : null;
}

// Extract task title from common patterns
function extractTitle(text: string): string {
    // Remove common command words
    let title = text
        .replace(/^(add|create|new|make|schedule|start|begin|work on)\s+/i, "")
        .replace(/\s*(task|timer|for)\s*/gi, " ")
        .replace(/\s*(for\s+)?\d+\s*(hour|hr|h|minute|min|m)s?\b/gi, "")
        .replace(/\s*(today|tomorrow|now)\s*/gi, "")
        .replace(/\s*from\s*\d+\s*to\s*\d+\s*/gi, "")
        .trim();

    // Capitalize first letter
    if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title || "New Task";
}

// Extract scheduled date from text (e.g., "tomorrow", "today")
function extractScheduledDate(text: string): string | null {
    const lowerText = text.toLowerCase();
    const today = new Date();

    if (lowerText.includes("tomorrow")) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const day = String(tomorrow.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // Default to null (will use today in the executor)
    return null;
}

// Keywords for different actions
const CREATE_KEYWORDS = ["add", "create", "new", "make", "homework", "study", "assignment", "task"];
const START_KEYWORDS = ["start", "begin", "work on", "focus on", "timer"];
const DELETE_KEYWORDS = ["delete", "remove", "cancel"];
const STOP_KEYWORDS = ["stop", "pause", "end"];

function containsAny(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some((keyword) => lowerText.includes(keyword));
}

function shouldAutoStart(text: string): boolean {
    const lowerText = text.toLowerCase();
    return START_IMMEDIATELY_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

/**
 * Parse user input and return an AI action
 * This mock version uses keyword matching
 */
export async function parseUserInput(input: string): Promise<AICommandResponse> {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
        return {
            success: false,
            action: null,
            message: "Please enter a command.",
            error: "Empty input",
        };
    }

    const lowerInput = trimmedInput.toLowerCase();

    // Check for DELETE action
    if (containsAny(lowerInput, DELETE_KEYWORDS)) {
        const action: DeleteTaskAction = {
            action: AI_ACTIONS.DELETE_TASK,
            taskId: "NEEDS_SELECTION", // UI will need to handle this
        };
        return {
            success: true,
            action,
            message: "Which task would you like to delete?",
        };
    }

    // Check for STOP action (stop timer)
    if (containsAny(lowerInput, STOP_KEYWORDS)) {
        return {
            success: true,
            action: null,
            message: "Stopping the current timer.",
        };
    }

    // Check for START action (explicit start command)
    if (containsAny(lowerInput, START_KEYWORDS) && !containsAny(lowerInput, CREATE_KEYWORDS)) {
        const title = extractTitle(trimmedInput);
        const action: StartTaskAction = {
            action: AI_ACTIONS.START_TASK,
            taskTitle: title !== "New Task" ? title : undefined,
        };
        return {
            success: true,
            action,
            message: title !== "New Task"
                ? `Starting timer for: ${title}`
                : "Starting the suggested task.",
        };
    }

    // Check for CREATE action (default for most inputs)
    if (containsAny(lowerInput, CREATE_KEYWORDS) || trimmedInput.length > 3) {
        const title = extractTitle(trimmedInput);
        const duration = extractDuration(trimmedInput);
        const scheduledDate = extractScheduledDate(trimmedInput);
        const autoStart = shouldAutoStart(trimmedInput) && duration !== null && !scheduledDate;

        const action: CreateTaskAction = {
            action: AI_ACTIONS.CREATE_TASK,
            title,
            estimatedTime: duration, // Will be null if not specified
            autoStart,
            date: scheduledDate ?? undefined, // Use date field as per interface
        };

        // Determine if we need time input
        const needsTimeInput = duration === null;

        if (needsTimeInput) {
            return {
                success: true,
                action,
                message: `Creating "${title}"${scheduledDate ? ' for tomorrow' : ''}...`,
                needsTimeInput: true,
            };
        }

        return {
            success: true,
            action,
            message: autoStart
                ? `Created and started: "${title}" (${duration} min)`
                : `Created task: "${title}" (${duration} min)${scheduledDate ? ' for tomorrow' : ''}`,
        };
    }

    // Fallback: couldn't understand
    return {
        success: false,
        action: null,
        message: "I didn't understand that. Try something like 'Add homework for 30 minutes' or 'Start studying'.",
        error: "Could not parse input",
    };
}

/**
 * Get example commands for users
 */
export function getExampleCommands(): string[] {
    return [
        "Add homework for 30 minutes",
        "Create physics study task for 1 hour",
        "Start working on math",
        "New assignment: Read chapter 5",
        "Study biology for 45 min",
    ];
}

/**
 * Interface for the AI service (to be implemented with Ollama later)
 */
export interface AIService {
    parseUserInput: (input: string) => Promise<AICommandResponse>;
    getExampleCommands: () => string[];
}

/**
 * Mock AI service instance
 */
export const mockAIService: AIService = {
    parseUserInput,
    getExampleCommands,
};
