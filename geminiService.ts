
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    primaryCaption: { type: Type.STRING },
    variants: { type: Type.ARRAY, items: { type: Type.STRING } },
    comprehensiveParagraph: { type: Type.STRING },
    detailedAnalysis: {
      type: Type.OBJECT,
      properties: {
        scene: { type: Type.STRING },
        people: { type: Type.STRING },
        actions: { type: Type.STRING },
        setting: { type: Type.STRING },
        objects: { type: Type.STRING },
        colors: { type: Type.STRING },
        mood: { type: Type.STRING },
        time: { type: Type.STRING },
        clothing: { type: Type.STRING },
        background: { type: Type.STRING },
        focus: { type: Type.STRING },
        details: { type: Type.STRING }
      },
      required: ["scene", "people", "actions", "setting", "objects", "colors", "mood", "time", "clothing", "background", "focus", "details"]
    }
  },
  required: ["primaryCaption", "variants", "comprehensiveParagraph", "detailedAnalysis"]
};

/**
 * Analyzes image and returns initial English results for maximum accuracy.
 */
export const analyzeImage = async (
  base64Image: string
): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";

  const prompt = `Analyze this image in extreme detail as an expert visual analyst.
  Identify subjects, environment, mood, and subtle details. 
  Provide exactly 4 alternative captions in the 'variants' array.
  All output must be in English.
  Return valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI model.");
    return JSON.parse(text);
  } catch (err) {
    console.error("Analysis Error:", err);
    throw err;
  }
};

/**
 * Translates the AnalysisResult into a target language using Gemini.
 */
export const translateResult = async (
  result: AnalysisResult,
  targetLanguage: string
): Promise<AnalysisResult> => {
  if (targetLanguage.toLowerCase() === 'english') return result;

  const model = "gemini-3-flash-preview";
  const prompt = `Translate this image analysis JSON into ${targetLanguage}. 
  Keep the same JSON structure. Maintain professional, descriptive language.
  
  JSON: ${JSON.stringify(result)}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ text: prompt }],
      config: { 
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("Translation failed - empty response.");
    return JSON.parse(text);
  } catch (err) {
    console.error("Translation Error:", err);
    throw err;
  }
};

/**
 * Generates speech using Gemini 2.5 TTS.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, 
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed.");
  return base64Audio;
};

export const decodeBase64 = (base64: string) => {
  if (!base64) return new Uint8Array(0);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  if (!data || data.length === 0) return ctx.createBuffer(numChannels, 1, sampleRate);
  
  const byteLength = data.byteLength;
  const bufferToUse = byteLength % 2 === 0 ? data.buffer : data.buffer.slice(0, byteLength - 1);
  const dataInt16 = new Int16Array(bufferToUse, data.byteOffset, Math.floor(byteLength / 2));
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, Math.floor(frameCount), sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};
