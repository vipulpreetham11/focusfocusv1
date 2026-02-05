import { AICommandResponse, AIAction, AI_ACTIONS, CreateTaskAction } from "@/types/aiActions";
import { validateAIAction, isCreateTaskAction } from "@/lib/aiActionValidator";

/**
 * Ollama API Configuration
 */
const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_MODEL = "llama3";

/**
 * System prompt for the AI - strict JSON-only mode
 */
const SYSTEM_PROMPT = `You are a task interpretation assistant.

Rules:
- Respond with ONLY valid JSON.
- Output exactly ONE action.
- Do NOT include explanations or extra text.
- Do NOT guess time values.
- If time is not explicitly mentioned, set estimatedTime to null.
- Supported actions: create_task, update_task, delete_task, start_task, plan_day.

Examples:
User: "Study maths for 45 minutes"
Response: { "action": "create_task", "title": "Study maths", "estimatedTime": 45 }

User: "Plan my day"
Response: { "action": "plan_day" }

User: "What should I do now?"
Response: { "action": "start_task" }`;

/**
 * Call Ollama API with a prompt
 * @param prompt - The user's input text
 * @returns The generated text response
 */
export async function callOllama(prompt: string): Promise<string> {
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: "${prompt}"\nResponse:`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: fullPrompt,
            stream: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "";
}

/**
 * Extract JSON from AI response (handles potential extra text)
 * - Finds the first '{' and the last '}'
 * - Ignores text before and after
 */
function extractJSON(response: string): string | null {
    const firstOpen = response.indexOf("{");
    const lastClose = response.lastIndexOf("}");

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        return response.substring(firstOpen, lastClose + 1);
    }
    return null;
}

/**
 * Check if Ollama is running
 */
export async function isOllamaAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: "GET",
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Keywords that indicate user wants to START immediately
 */
const START_KEYWORDS = ["start", "begin", "work on", "focus on", "timer", "now", "go"];

function shouldAutoStart(text: string): boolean {
    const lowerText = text.toLowerCase();
    return START_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

/**
 * Parse user input using Ollama AI
 */
export async function parseUserInputWithOllama(input: string): Promise<AICommandResponse> {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
        return {
            success: false,
            action: null,
            message: "Please enter a command.",
            error: "Empty input",
        };
    }

    try {
        // Check if this is a stop command (handle locally, no need for AI)
        const lowerInput = trimmedInput.toLowerCase();
        if (lowerInput.includes("stop") || lowerInput.includes("pause")) {
            return {
                success: true,
                action: null,
                message: "Stopping the current timer.",
            };
        }

        // Call Ollama
        const rawResponse = await callOllama(trimmedInput);

        // Extract JSON from response
        const jsonString = extractJSON(rawResponse);
        if (!jsonString) {
            return {
                success: false,
                action: null,
                message: "I didn't understand that, can you rephrase?",
                error: "No valid JSON found",
            };
        }

        // Parse JSON
        let action: AIAction;
        try {
            action = JSON.parse(jsonString);
        } catch {
            return {
                success: false,
                action: null,
                message: "I didn't understand that, can you rephrase?",
                error: "JSON parse error",
            };
        }

        // Validate action
        const validation = validateAIAction(action);
        if (!validation.valid) {
            return {
                success: false,
                action: null,
                message: "I didn't understand that, can you rephrase?",
                error: validation.error,
            };
        }

        // Handle create_task with autoStart logic
        if (isCreateTaskAction(action)) {
            const createAction = action as CreateTaskAction;
            const needsTimeInput = createAction.estimatedTime === null;
            const autoStart = shouldAutoStart(trimmedInput) && !needsTimeInput;

            // Add autoStart flag
            createAction.autoStart = autoStart;

            if (needsTimeInput) {
                return {
                    success: true,
                    action: createAction,
                    message: `Creating "${createAction.title}"...`,
                    needsTimeInput: true,
                };
            }

            return {
                success: true,
                action: createAction,
                message: autoStart
                    ? `Created and started: "${createAction.title}" (${createAction.estimatedTime} min)`
                    : `Created task: "${createAction.title}" (${createAction.estimatedTime} min)`,
            };
        }

        // Handle other actions
        return {
            success: true,
            action,
            message: getActionMessage(action),
        };
    } catch (error) {
        // Check if Ollama is not running
        const isAvailable = await isOllamaAvailable();
        if (!isAvailable) {
            return {
                success: false,
                action: null,
                message: "AI assistant is offline. Please make sure Ollama is running (ollama serve).",
                error: "Ollama not available",
            };
        }

        // Other error
        console.error("Ollama error:", error);
        return {
            success: false,
            action: null,
            message: "I didn't understand that, can you rephrase?",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

const SYLLABUS_PROMPT = `You are an academic study planner.
 
Given a subject and chapter name, break the chapter into logical study units.
 
Rules:
- Respond ONLY in valid JSON.
- Do NOT include explanations.
- Each unit must be small and studyable in one sitting.
- Suggest realistic time in minutes per unit.
- Do NOT guess difficulty beyond normal student level.
- Format: {"units": [{"title": "string", "time": number}]}`;

export async function analyzeChapterWithAI(subject: string, chapter: string): Promise<{ title: string; time: number }[]> {
    const prompt = `Subject: ${subject}\nChapter: ${chapter}\n\n${SYLLABUS_PROMPT}`;

    try {
        const rawResponse = await callOllama(prompt);
        const jsonString = extractJSON(rawResponse);

        if (!jsonString) return [];

        const parsed = JSON.parse(jsonString);
        if (parsed.units && Array.isArray(parsed.units)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return parsed.units.map((u: any) => ({
                title: String(u.title || "Study Session"),
                time: Number(u.time || 30)
            }));
        }
        return [];
    } catch (error) {
        console.error("AI Analysis failed:", error);
        return [];
    }
}

/**
 * Get a user-friendly message for an action
 */
function getActionMessage(action: AIAction): string {
    switch (action.action) {
        case AI_ACTIONS.CREATE_TASK:
            return `Creating task: "${(action as CreateTaskAction).title}"`;
        case AI_ACTIONS.START_TASK:
            return "Starting the timer...";
        case AI_ACTIONS.DELETE_TASK:
            return "Deleting task...";
        case AI_ACTIONS.UPDATE_TASK:
            return "Updating task...";
        case AI_ACTIONS.PLAN_DAY:
            return "Generating your daily plan...";
        default:
            return "Processing...";
    }
}

/**
 * AI Service interface for Ollama
 */
export const ollamaAIService = {
    parseUserInput: parseUserInputWithOllama,
    isAvailable: isOllamaAvailable,
};
