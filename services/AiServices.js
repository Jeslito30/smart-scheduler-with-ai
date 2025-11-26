import { GoogleGenAI } from "@google/genai";

// ⚠️ Security Warning: Do not store keys in plain text in production.
const API_KEY = "API_KEY_HERE"; 

// Initialize the client with the new SDK
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getScheduleRecommendation = async (userTasks, userPrompt) => {
  try {
    const currentDate = new Date();
    const dateString = currentDate.toDateString();
    const timeString = currentDate.toLocaleTimeString();

    // 1. Construct the Prompt
    const prompt = `
      You are a smart scheduling assistant for a React Native app.
      
      **Context:**
      - Current Date & Time: ${dateString}, ${timeString}
      - Existing Tasks: ${JSON.stringify(userTasks)}
      
      **User Request:** "${userPrompt}"
      
      **Goal:** Analyze the user's existing schedule and find a conflict-free time slot to fulfill their request.
      
      **Output Requirement:**
      Return ONLY a valid JSON object. Do not include markdown formatting (no \`\`\`json).
      
      The JSON must strictly match this schema:
      {
        "title": "String (Task Title)",
        "description": "String (Brief description)",
        "date": "String (YYYY-MM-DD)",
        "time": "String (HH:MM AM/PM)",
        "reason": "String (Short explanation)"
      }
    `;

    // 2. Generate Content using the new SDK and active model (Gemini 2.5 Flash)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    // 3. Clean and Parse Response
    // Note: In the new SDK, 'text' is a property, not a function.
    let text = response.text; 

    console.log("Raw AI Response:", text);

    // Remove any markdown if present
    if (text && typeof text === 'string') {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const recommendation = JSON.parse(text);
    
    if (!recommendation.title || !recommendation.date || !recommendation.time) {
        throw new Error("Incomplete recommendation data received.");
    }

    return recommendation;

  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};