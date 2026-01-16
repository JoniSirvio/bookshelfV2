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
