
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardResult, ShotSize } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // ALWAYS use this structure for initialization
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeAndGenerate(imagesBase64: string[], selectedShots: ShotSize[]): Promise<StoryboardResult> {
    // Using gemini-3-pro-preview for complex reasoning and high-quality creative analysis
    const model = 'gemini-3-pro-preview';
    
    // Extracting mimeType from data URL to be more robust
    const imageParts = imagesBase64.map(base64 => {
      const mimeType = base64.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
      return {
        inlineData: {
          data: base64.split(',')[1],
          mimeType: mimeType
        }
      };
    });

    const shotSizesEn = selectedShots.join(', ');

    const prompt = `
      Analyze the provided reference images to extract key visual elements (Subject, Clothing, Environment, Lighting, Mood).
      Then, generate a professional storyboard prompt with 9 shots.
      The requested camera shot sizes are: ${shotSizesEn}.

      Return the result in JSON format with both English (EN) and Chinese (CN) translations.
      The structure must be:
      {
        "scenePrompt": {
          "en": "Detailed base description of the scene/subject in English",
          "cn": "场景和主体的详细描述（中文）"
        },
        "shots": [
          {
            "id": 1,
            "description": {
              "en": "Shot 1 detailed visual description in English",
              "cn": "镜头1的详细视觉描述（中文）"
            }
          },
          ... (total 9 shots)
        ]
      }

      Important rules:
      1. Ensure strict visual consistency across all 9 shots (same character features, clothes, lighting).
      2. Follow the requested shot sizes.
      3. Descriptions should be cinematic and detailed.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model,
        // Using recommended contents structure
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenePrompt: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  cn: { type: Type.STRING }
                },
                required: ["en", "cn"]
              },
              shots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    description: {
                      type: Type.OBJECT,
                      properties: {
                        en: { type: Type.STRING },
                        cn: { type: Type.STRING }
                      },
                      required: ["en", "cn"]
                    }
                  },
                  required: ["id", "description"]
                }
              }
            },
            required: ["scenePrompt", "shots"]
          }
        }
      });

      // response.text is a property, not a method.
      const result = JSON.parse(response.text || '{}') as StoryboardResult;
      return result;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  async regenerateShot(
    scenePrompt: { en: string; cn: string },
    shotId: number,
    shotSize: ShotSize
  ): Promise<{ en: string; cn: string }> {
    const model = 'gemini-3-flash-preview'; // Flash is fast and sufficient for text rewriting

    const prompt = `
      Context: A storyboard scene description:
      "${scenePrompt.en}"

      Task: Rewrite the detailed visual description for Shot ${shotId} ONLY.
      The new Camera Shot Size is: ${shotSize}.

      Requirements:
      1. Keep it consistent with the provided scene context.
      2. Focus on the composition dictated by the '${shotSize}'.
      3. Return ONLY a JSON object with this structure:
      {
        "en": "New English description...",
        "cn": "New Chinese description..."
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              en: { type: Type.STRING },
              cn: { type: Type.STRING }
            },
            required: ["en", "cn"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Gemini API Error (Regenerate Shot):", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
