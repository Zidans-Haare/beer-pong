
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

export class GeminiService {
    private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
    private static model = API_KEY ? GeminiService.genAI?.getGenerativeModel({ model: "gemini-pro" }) : null;

    static async generateCommentary(context: string): Promise<string | null> {
        if (!this.model) {
            console.warn("Gemini API Key not configured. Skipping commentary.");
            return null;
        }

        try {
            const prompt = `
            Du bist ein energetischer, lustiger und etwas überdrehter Bierpong-Kommentator.
            Kommentiere das folgende Ereignis kurz und knackig (max 2 Sätze).
            Benutze KEINE Emojis. Nur Text.
            WICHTIG: Nutze Bierpong-Begriffe!
            - Sage NICHT "Tor" oder "Punkte".
            - Sage "Treffer", "Becher", "Versenkt", "Re-Rack", "Island", "Airball".
            - Kontext: Ein Spielstand-Update von X:Y bedeutet, X und Y sind getroffene Becher (oder verbleibende, je nach Kontext, aber nimm es als Treffer).
            Sei parteiisch oder sarkastisch wenn es passt.
            
            Ereignis-Kontext:
            ${context}
            `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error:", error);
            return null;
        }
    }
}
