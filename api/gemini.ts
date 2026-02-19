import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export interface AIRecommendation {
    title: string;
    author: string;
    reason: string;
}

export const getBookRecommendations = async (readBooks: string[], userWishes?: string): Promise<AIRecommendation[]> => {
    if (!API_KEY) {
        console.error("Gemini API Key is missing");
        return [];
    }

    if (readBooks.length === 0) {
        return [];
    }

    let prompt = `
    Based on the following list of books I have read:
    ${readBooks.join(", ")}
    `;

    if (userWishes) {
        prompt += `
        The user has also expressed the following specific wishes for recommendations:
        "${userWishes}"
        Please prioritize these wishes while still considering the user's reading history.
        `;
    }

    prompt += `
    CRITICAL INSTRUCTION: You must ONLY recommend books that have been officially translated into Finnish or are originally written in Finnish. 
    Do NOT translate English titles into Finnish yourself. You MUST use the exact, official Finnish title as it appears in library databases (like Finna.fi).
    If a book has not been translated into Finnish, do NOT recommend it. 
    
    Please recommend 10 new books that I haven't read yet that are available in Finnish.
    For each book, provide a "personalized_description" (in Finnish).
    This description must combine two things seamlessly:
    1. A very short plot teaser (what is the book about).
    2. A direct explanation of why I specifically would like it based on my history (e.g., comparing atmosphere, character types, or writing style to authors I listed).

    Do not separate these into "Description" and "Reason". Blend them into one engaging paragraph (max 3 sentences).

    Return the result strictly as a valid JSON array of objects with the following structure:
    [
        {
            "title": "Official Finnish Title",
            "author": "Author Name",
            "reason": "Short reason in Finnish"
        }
    ]
    Do not include any markdown formatting (like \`\`\`json). Just the raw JSON string.
    `;

    try {
        console.log("Sending prompt to Gemini:", prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini response:", text);

        // Clean up markdown if Gemini adds it despite instructions
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const recommendations: AIRecommendation[] = JSON.parse(cleanText);
        return recommendations.slice(0, 10);
    } catch (error) {
        console.error("Error fetching recommendations from Gemini:", error);
        throw error;
    }
};

/**
 * Ask AI to describe a book without spoilers. Optionally include the user's own question.
 * Returns plain text in Finnish.
 */
export const askAboutBook = async (
    title: string,
    authors?: string[],
    userQuestion?: string
): Promise<string> => {
    if (!API_KEY) {
        console.error("Gemini API Key is missing");
        return "API-avain puuttuu. Aseta EXPO_PUBLIC_GEMINI_API_KEY.";
    }

    const authorStr = authors?.length ? authors.join(", ") : "tuntematon";
    let prompt = `
Describe the following book briefly and in Finnish. Give a short, engaging description that helps the reader decide if they want to read it.
Do NOT include spoilers. Do NOT reveal major plot twists or the ending.
Book: "${title}" by ${authorStr}.
`;

    if (userQuestion?.trim()) {
        prompt += `
The user also has a specific question about this book:
"${userQuestion.trim()}"
Please answer this question in Finnish, still avoiding spoilers.
`;
    }

    prompt += `
Reply in Finnish only. Use clear, natural language. Do not use markdown or bullet points unless it fits the answer.
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text.trim();
    } catch (error) {
        console.error("Error asking about book from Gemini:", error);
        throw error;
    }
};

/** One message in the conversation (for chatAboutBook). */
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    displayLabel?: string;  // Short label for quick command only (no extra input)
    displayIcon?: string;   // MaterialCommunityIcons name
    displayText?: string;   // User's additional input when they wrote in prompt (overrides displayLabel)
}

export type BookChatMode = 'description' | 'goodfit' | 'custom';

/**
 * Chat about a book with optional conversation history (for follow-ups).
 * Modes: description (no spoilers), goodfit (compare to read books), custom (user's own question).
 * Returns the model response and the updated conversation history.
 */
export const chatAboutBook = async (
    book: { title: string; authors?: string[] },
    options: {
        mode: BookChatMode;
        readBooksTitles?: string[];
        userMessage?: string;
        displayLabel?: string;
        displayIcon?: string;
        displayText?: string;
    },
    conversationHistory: ChatMessage[] = []
): Promise<{ response: string; newHistory: ChatMessage[] }> => {
    if (!API_KEY) {
        throw new Error("API-avain puuttuu. Aseta EXPO_PUBLIC_GEMINI_API_KEY.");
    }

    const authorStr = book.authors?.length ? book.authors.join(', ') : 'tuntematon';
    const bookContext = `Kirja: "${book.title}" kirjailijalta ${authorStr}.`;

    const buildFirstPrompt = (): string => {
        switch (options.mode) {
            case 'description':
                return `Kuvaile tämä kirja lyhyesti suomeksi ilman spoilereita. Anna lyhyt, mielenkiintoinen kuvaus, joka auttaa lukijaa päättämään haluaako hän lukea kirjan. ${bookContext} Vastaa vain suomeksi, selkeällä kielellä.`;
            case 'goodfit':
                const readList = (options.readBooksTitles?.length)
                    ? `Olen lukenut nämä kirjat: ${options.readBooksTitles.join('; ')}.`
                    : 'En ole vielä lukenut kirjoja (lista on tyhjä).';
                return `${readList} Sopiiko tämä kirja minulle? ${bookContext} Vastaa suomeksi ja perustele lyhyesti. Älä paljasta juonikohtauksia.`;
            case 'custom':
                const q = (options.userMessage || '').trim();
                return q
                    ? `Käyttäjä kysyy tästä kirjasta: ${bookContext} Kysymys: "${q}" Vastaa suomeksi, älä paljasta spoilereita.`
                    : `Käyttäjä haluaa tietää tästä kirjasta: ${bookContext} Anna lyhyt kuvaus suomeksi ilman spoilereita.`;
        }
    };

    const historyToGemini = (messages: ChatMessage[]): { role: 'user' | 'model'; parts: { text: string }[] }[] => {
        return messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    };

    const isRetryableError = (e: unknown): boolean => {
        const err = e as { message?: string; code?: string };
        const msg = (err?.message ?? '').toLowerCase();
        const code = err?.code ?? '';
        const retryableCodes = ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'];
        if (retryableCodes.includes(code)) return true;
        const retryableSubstrings = ['network', 'fetch', 'timeout', 'econnrefused', 'etimedout', 'econnreset', 'failed to fetch'];
        return retryableSubstrings.some(s => msg.includes(s));
    };

    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    const maxAttempts = 3;
    const delayMs = 1000;

    let userMessage: string;
    let history = conversationHistory;

    if (history.length === 0) {
        userMessage = buildFirstPrompt();
    } else {
        const msg = (options.userMessage || '').trim();
        if (!msg) {
            if (options.mode === 'custom') return { response: '', newHistory: history };
            userMessage = buildFirstPrompt();
        } else {
            userMessage = msg;
        }
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const geminiHistory = historyToGemini(history);
            const chat = model.startChat({ history: geminiHistory });
            const result = await chat.sendMessage(userMessage);
            const response = result.response;
            const text = response.text().trim();

            const userMsg: ChatMessage = {
                role: 'user',
                text: userMessage,
                ...(options.displayLabel != null && { displayLabel: options.displayLabel }),
                ...(options.displayIcon != null && { displayIcon: options.displayIcon }),
                ...(options.displayText != null && { displayText: options.displayText }),
            };
            const newHistory: ChatMessage[] = [
                ...history,
                userMsg,
                { role: 'model', text },
            ];

            return { response: text, newHistory };
        } catch (error) {
            lastError = error;
            console.error('Error in chatAboutBook:', error);
            if (attempt < maxAttempts && isRetryableError(error)) {
                await delay(delayMs);
                continue;
            }
            throw error;
        }
    }

    throw lastError;
};
