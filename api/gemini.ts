import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiTools, executeGeminiTool, ToolContext } from "./geminiTools";
import { FinnaSearchResult } from "./finna";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const SYSTEM_INSTRUCTION = `Olet fiksu, asiantunteva ja luonteva kirja-avustaja Bookshelf-sovelluksessa.

TÄRKEÄT SÄÄNNÖT KIELESTÄ JA KIRJOJEN NIMISTÄ:
1. ÄLÄ KOSKAAN KEKSI TEKAISTUJA SUOMENNOKSIA KIRJOJEN NIMILLE:
   - Jos kirjaa ei ole virallisesti julkaistu suomeksi (kuten Brandon Sandersonin "Words of Radiance"), käytä AINA sen aitoa alkuperäiskielistä nimeä ("Words of Radiance"). Älä koskaan keksi omasta päästäsi suomenkielisiä nimiä (kuten "Sanojen valo")!
   - Älä pakota kirjoja suomenkielisiksi! Käyttäjä lukee kirjoja useilla eri kielillä (kuten englanniksi ja suomeksi).
   - Jos kirjalla on virallinen julkaistu suomennos (esim. "The Way of Kings" -> "Surun kahleissa"), voit mainita sen, mutta kansainvälisten sarjojen kohdalla mainitse myös alkuperäinen nimi. Jos virallista suomennosta ei ole olemassa, käytä VAIN ja AINOASTAAN alkuperäistä nimeä.

2. AUDIOBOOKSHELF (ABS) JA HAKUSANAT:
   - Käyttäjän omalla Audiobookshelf-palvelimella teokset ja tiedostot ovat usein niiden alkuperäiskielellä (usein englanniksi, esim. "Words of Radiance").
   - Kun haet "check_audiobookshelf"-työkalulla, käytä AINA kirjan aitoa nimeä (esim. "Words of Radiance"), kirjailijan nimeä (esim. "Brandon Sanderson") tai sarjan nimeä (esim. "Stormlight Archive").
   - ÄLÄ KOSKAAN hae ABS:stä keksimilläsi suomennosnimillä tai suomenkielisillä lauseilla (kuten "seuraava Stormlight Archive kirja" tai "Sanojen valo")! Tällainen haku ei löydä mitään käyttäjän palvelimelta.
   - Jos käyttäjä kysyy tietystä teoksesta tai sarjan seuraavasta osasta (esim. Stormlight Archive osa 2), selvitä ensin teoksen oikea nimi ("Words of Radiance") ja hae sillä tai kirjailijan nimellä.
   - Jos käyttäjä mainitsee "ABS", "Audiobookshelf", "äänikirja", "äänikirjat", "e-kirja", "omasta kirjastosta", "palvelimelta" tai kysyy mitä teoksia hänellä on omalla palvelimellaan: KÄYTÄ AINA JA VAIN "check_audiobookshelf"-työkalua. ÄLÄ hae Finnasta, jos pyyntö koskee ABS:ää.
   - Jos käyttäjä pyytää selaamaan tai haluaa suosituksia ABS-kokoelmastaan, kutsu "check_audiobookshelf" ilman hakusanaa tai parametrilla "browse".
   - Jos teosta ei löydy käyttäjän ABS-palvelimelta oikeallakaan nimellä haettaessa, kerro suoraan ja rehellisesti alkuperäistä nimeä käyttäen (esim. "Teosta Words of Radiance ei löytynyt palvelimeltasi").

3. FINNA (search_finna, search_finna_batch):
   - Käytä Finna-hakua yleisiin kirjasuosituksiin ja kirjastosaatavuuteen. Huomaa, että Finnasta löytyy myös runsaasti englanninkielisiä ja muunkielisiä teoksia. Älä pakota Finna-haussakaan tekaistuja suomennoksia.
   - ÄLÄ kutsu Finnaa, jos käyttäjän pyyntö koskee Audiobookshelfia (ABS).

4. OMAT HYLLYT (get_user_shelf):
   - Käytä tätä, kun käyttäjä kysyy sovelluksen luetuista kirjoista ("read") tai lukulistalla olevista kirjoista ("myBooks").

5. VASTAUSTEN MUOTOILU:
   - Keskustele käyttäjän kanssa luontevalla suomen kielellä.
   - Kun suosittelet kirjoja käyttäjälle, liitä mukaan lyhyt, houkutteleva ja juonipaljastukseton kuvaus tai perustelu jokaisesta teoksesta.`;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
const modelWithTools = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    tools: geminiTools as any,
    systemInstruction: SYSTEM_INSTRUCTION,
});

const MAX_TOOL_TURNS = 3;

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
    INSTRUCTION FOR BOOK TITLES AND LANGUAGES:
    You can recommend books in Finnish or in English (or their original language). The user reads in multiple languages.
    If a book has an official, published Finnish translation, use the official Finnish title.
    If a book has NOT been translated into Finnish, use its REAL, official original title (e.g. English title).
    NEVER invent or make up Finnish translations for titles yourself.
    
    Please recommend 10 new books that I haven't read yet based on my reading history.
    For each book, provide a "personalized_description" (in Finnish).
    This description must combine two things seamlessly:
    1. A very short plot teaser (what is the book about).
    2. A direct explanation of why I specifically would like it based on my history (e.g., comparing atmosphere, character types, or writing style to authors I listed).

    Do not separate these into "Description" and "Reason". Blend them into one engaging paragraph (max 3 sentences).

    Return the result strictly as a valid JSON array of objects with the following structure:
    [
        {
            "title": "Official Title (Finnish if translated, or original title)",
            "author": "Author Name",
            "reason": "Short reason in Finnish"
        }
    ]
    Do not include any markdown formatting (like \`\`\`json). Just the raw JSON string.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

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

/** One message in the conversation (for chatAboutBook and chatGeneralBookChat). */
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    displayLabel?: string;  // Short label for quick command only (no extra input)
    displayIcon?: string;   // MaterialCommunityIcons name
    displayText?: string;   // User's additional input when they wrote in prompt (overrides displayLabel)
    attachedBooks?: FinnaSearchResult[]; // Real books verified or found by tools
}

export type BookChatMode = 'description' | 'goodfit' | 'custom';

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

const historyToGemini = (messages: ChatMessage[]): { role: 'user' | 'model'; parts: { text: string }[] }[] => {
    return messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
};

interface ToolExecutionTurnResult {
    text: string;
    attachedBooks?: FinnaSearchResult[];
}

/**
 * Executes a conversational turn with multi-turn tool calling support.
 */
async function runGeminiTurnWithTools(
    chat: any,
    initialMessage: string,
    toolContext?: ToolContext
): Promise<ToolExecutionTurnResult> {
    let result = await chat.sendMessage(initialMessage);
    const discoveredBooks: FinnaSearchResult[] = [];
    let turnCount = 0;

    while (turnCount < MAX_TOOL_TURNS) {
        const functionCalls = result.response.functionCalls?.();
        if (!functionCalls || functionCalls.length === 0) {
            break;
        }

        turnCount++;
        const functionResponses = await Promise.all(
            functionCalls.map(async (call: { name: string; args: any }) => {
                const execution = await executeGeminiTool(
                    call.name,
                    call.args || {},
                    toolContext || {}
                );

                if (execution.attachedBooks && execution.attachedBooks.length > 0) {
                    for (const book of execution.attachedBooks) {
                        if (!discoveredBooks.some((b) => b.id === book.id)) {
                            discoveredBooks.push(book);
                        }
                    }
                }

                return {
                    functionResponse: {
                        name: call.name,
                        response: execution.result,
                    },
                };
            })
        );

        result = await chat.sendMessage(functionResponses);
    }

    let text = '';
    try {
        text = result.response.text().trim();
    } catch {
        text = 'Löysin tiedot. Katso tulokset alta.';
    }

    return {
        text,
        attachedBooks: discoveredBooks.length > 0 ? discoveredBooks : undefined,
    };
}

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
        toolContext?: ToolContext;
    },
    conversationHistory: ChatMessage[] = []
): Promise<{ response: string; newHistory: ChatMessage[] }> => {
    if (!API_KEY) {
        throw new Error("API-avain puuttuu. Aseta EXPO_PUBLIC_GEMINI_API_KEY.");
    }

    const authorStr = book.authors?.length ? book.authors.join(', ') : 'tuntematon';
    const bookContext = `Kirja: "${book.title}" kirjailijalta ${authorStr}.`;

    const buildFirstPrompt = (): string => {
        const baseToolsHint = "Voit käyttää työkaluja kuten check_audiobookshelf (tarkistaaksesi löytyykö äänikirja käyttäjän palvelimelta) tai search_finna (tarkistaaksesi tietoja Finna-kirjastosta).";
        switch (options.mode) {
            case 'description':
                return `Kuvaile tämä kirja lyhyesti suomeksi ilman spoilereita. Anna lyhyt, mielenkiintoinen kuvaus, joka auttaa lukijaa päättämään haluaako hän lukea kirjan. ${bookContext} ${baseToolsHint} Vastaa vain suomeksi, selkeällä kielellä.`;
            case 'goodfit':
                const readList = (options.readBooksTitles?.length)
                    ? `Olen lukenut nämä kirjat: ${options.readBooksTitles.join('; ')}.`
                    : 'En ole vielä lukenut kirjoja (lista on tyhjä).';
                return `${readList} Sopiiko tämä kirja minulle? ${bookContext} ${baseToolsHint} Vastaa suomeksi ja perustele lyhyesti. Älä paljasta juonikohtauksia.`;
            case 'custom':
                const q = (options.userMessage || '').trim();
                return q
                    ? `Käyttäjä kysyy tästä kirjasta: ${bookContext} Kysymys: "${q}". ${baseToolsHint} Vastaa suomeksi, älä paljasta spoilereita.`
                    : `Käyttäjä haluaa tietää tästä kirjasta: ${bookContext} ${baseToolsHint} Anna lyhyt kuvaus suomeksi ilman spoilereita.`;
        }
    };

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
            const isAbsRequested = /(\babs\b|audiobookshelf|äänikirjasto|äänikirjoi|omasta kirjastosta|omalta palvelimelta)/i.test(msg);
            userMessage = isAbsRequested
                ? `${msg}\n\n[JÄRJESTELMÄOHJE: Käyttäjä pyysi tarkistamaan Audiobookshelfistä (ABS). Kutsu ehdottomasti "check_audiobookshelf"-työkalua. ÄLÄ kutsu "search_finna"-työkalua. TÄRKEÄÄ: Käytä hakusanana kirjan aitoa nimeä (usein englanniksi, esim. "Words of Radiance"), kirjailijaa tai sarjaa. ÄLÄ KOSKAAN keksi tekaistuja suomennoksia hakusanaksi tai vastaukseen!]`
                : msg;
        }
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const geminiHistory = historyToGemini(history);
            const chat = modelWithTools.startChat({ history: geminiHistory });
            const { text, attachedBooks } = await runGeminiTurnWithTools(chat, userMessage, options.toolContext);

            const rawDisplayText = options.displayText || options.userMessage?.trim();
            const userMsg: ChatMessage = {
                role: 'user',
                text: userMessage,
                ...(options.displayLabel != null && { displayLabel: options.displayLabel }),
                ...(options.displayIcon != null && { displayIcon: options.displayIcon }),
                ...(rawDisplayText ? { displayText: rawDisplayText } : {}),
            };

            const modelMsg: ChatMessage = {
                role: 'model',
                text,
                ...(attachedBooks && attachedBooks.length > 0 && { attachedBooks }),
            };

            const newHistory: ChatMessage[] = [
                ...history,
                userMsg,
                modelMsg,
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

/**
 * General book chat: recommendations and open-ended book questions with Gemini Tools enabled.
 */
export const chatGeneralBookChat = async (
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    readBooksTitles?: string[],
    displayOptions?: {
        displayLabel?: string;
        displayIcon?: string;
        displayText?: string;
        toolContext?: ToolContext;
    }
): Promise<{ response: string; newHistory: ChatMessage[] }> => {
    if (!API_KEY) {
        throw new Error("API-avain puuttuu. Aseta EXPO_PUBLIC_GEMINI_API_KEY.");
    }

    const maxAttempts = 3;
    const delayMs = 1000;

    const msg = userMessage.trim();
    if (!msg) return { response: '', newHistory: conversationHistory };

    let history = conversationHistory;
    let promptToSend: string;

    const isAbsRequested = /(\babs\b|audiobookshelf|äänikirjasto|äänikirjoi|omasta kirjastosta|omalta palvelimelta)/i.test(msg);
    const absNotice = `\n\n[JÄRJESTELMÄOHJE: Käyttäjä pyysi hakemaan tai tarkistamaan Audiobookshelfistä (ABS). Kutsu ehdottomasti "check_audiobookshelf"-työkalua. ÄLÄ kutsu "search_finna"-työkalua. TÄRKEÄÄ: Käytä hakusanana kirjan aitoa nimeä (usein englanniksi, esim. "Words of Radiance"), kirjailijaa tai sarjaa. ÄLÄ KOSKAAN keksi tekaistuja suomennoksia (kuten "Sanojen valo") hakusanaksi tai vastaukseen! Käyttäjä lukee useilla kielillä eikä kirjoja pidä pakottaa suomenkielisiksi.]`;

    if (history.length === 0) {
        const readContext = (readBooksTitles?.length)
            ? `Käyttäjä on lukenut sovelluksessa mm.: ${readBooksTitles.join('; ')}. `
            : '';
        promptToSend = `${readContext}Käyttäjän viesti: "${msg}"`;
        if (isAbsRequested) {
            promptToSend += absNotice;
        }
    } else {
        if (isAbsRequested) {
            promptToSend = `${msg}${absNotice}`;
        } else {
            promptToSend = msg;
        }
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const geminiHistory = historyToGemini(history);
            const chat = modelWithTools.startChat({ history: geminiHistory });
            const { text, attachedBooks } = await runGeminiTurnWithTools(chat, promptToSend, displayOptions?.toolContext);

            const userMsg: ChatMessage = {
                role: 'user',
                text: promptToSend,
                ...(displayOptions?.displayLabel != null && { displayLabel: displayOptions.displayLabel }),
                ...(displayOptions?.displayIcon != null && { displayIcon: displayOptions.displayIcon }),
                ...(displayOptions?.displayText != null
                    ? { displayText: displayOptions.displayText }
                    : { displayText: msg }),
            };

            const modelMsg: ChatMessage = {
                role: 'model',
                text,
                ...(attachedBooks && attachedBooks.length > 0 && { attachedBooks }),
            };

            const newHistory: ChatMessage[] = [
                ...history,
                userMsg,
                modelMsg,
            ];

            return { response: text, newHistory };
        } catch (error) {
            lastError = error;
            console.error('Error in chatGeneralBookChat:', error);
            if (attempt < maxAttempts && isRetryableError(error)) {
                await delay(delayMs);
                continue;
            }
            throw error;
        }
    }

    throw lastError;
};
