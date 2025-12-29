
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardResult, ShotSize, GridLayout, AspectRatio } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // ALWAYS use this structure for initialization
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeAndGenerate(
    imagesBase64: string[], 
    selectedShots: ShotSize[],
    layout: GridLayout,
    aspectRatio: AspectRatio
  ): Promise<StoryboardResult> {
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
    const numShots = layout === '3x3' ? 9 : 4;
    const numTransitions = numShots - 1;

    const prompt = `
      Analyze the provided reference images to extract key visual elements (Subject, Clothing, Environment, Lighting, Mood).
      
      Task 1: Generate a professional storyboard prompt with ${numShots} shots.
      The requested camera shot sizes are: ${shotSizesEn}.
      The target aspect ratio for the final image is ${aspectRatio}.

      Task 2: Generate ${numTransitions} specific "Video Transition Prompts" to bridge the gap between consecutive shots (Shot 1->2, 2->3, etc.).
      These prompts will be used in AI video generators (like Luma or Runway) using Shot N as the Start Frame and Shot N+1 as the End Frame.
      The transition prompts must:
      - Be highly detailed and cinematic.
      - Describe the specific camera movement (e.g., "Slow zoom in," "Pan right," "Rack focus") needed to get from visual A to visual B.
      - Describe the subject's action or subtle movements during the transition.
      - Ensure physics and lighting continuity.
      - Aim for a smooth, natural flow.

      Return the result in JSON format with both English (EN) and Chinese (CN) translations.
      The structure must be:
      {
        "scenePrompt": {
          "en": "Detailed base description of the scene/subject",
          "cn": "..."
        },
        "shots": [
          { "id": 1, "description": { "en": "...", "cn": "..." } },
          ... (total ${numShots} shots)
        ],
        "transitions": [
          {
            "fromShot": 1,
            "toShot": 2,
            "prompt": {
              "en": "Detailed video generation prompt describing the motion from shot 1 to 2...",
              "cn": "描述从镜头1过渡到镜头2的详细视频生成提示词..."
            }
          },
          ... (total ${numTransitions} transitions)
        ]
      }

      Important rules:
      1. Ensure strict visual consistency across all shots.
      2. Follow the requested shot sizes.
      3. Transition prompts must be actionable instructions for a video model.
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
              },
              transitions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fromShot: { type: Type.NUMBER },
                    toShot: { type: Type.NUMBER },
                    prompt: {
                      type: Type.OBJECT,
                      properties: {
                        en: { type: Type.STRING },
                        cn: { type: Type.STRING }
                      },
                      required: ["en", "cn"]
                    }
                  },
                  required: ["fromShot", "toShot", "prompt"]
                }
              }
            },
            required: ["scenePrompt", "shots", "transitions"]
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
