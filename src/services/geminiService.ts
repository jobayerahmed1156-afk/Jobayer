import { GoogleGenAI } from "@google/genai";

export const analyzeRecitation = async (audioBase64: string, targetVerse: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
    You are an expert Quran recitation (Tajweed) analyzer. 
    I will provide an audio recording of a user reciting a specific verse.
    Target Verse: "${targetVerse}"
    
    Please analyze the audio and compare it to the target verse.
    1. Transcribe what the user said.
    2. Identify any missing words, mispronounced words, or Tajweed errors.
    3. Provide a score from 0-100.
    4. Give constructive feedback in Bengali (since the user requested in Bengali).
    
    Return the response in JSON format:
    {
      "transcription": "...",
      "isCorrect": boolean,
      "wordAnalysis": [
        { 
          "word": "word1", 
          "status": "correct" | "incorrect" | "missing", 
          "feedback": "brief feedback",
          "pronunciationGuide": "Detailed guide in Bengali on how to pronounce this word correctly, including tongue placement or Tajweed rules if applicable."
        }
      ],
      "errors": ["error1", "error2"],
      "score": number,
      "feedback": "..."
    }
    Ensure the "wordAnalysis" array contains every word from the target verse in order.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "audio/webm",
              data: audioBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
};
