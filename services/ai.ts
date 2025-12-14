import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { Message, Role, ChildProfile } from '../types';

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;
// Shared AudioContext to handle browser autoplay policies
let sharedAudioContext: AudioContext | null = null;
// DeepSeek messages store (OpenAI-compatible schema)
let deepseekMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

const isDeepSeek = () => !!process.env.DEEPSEEK_API_KEY;

export const getAudioContext = () => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return sharedAudioContext;
};

const SYSTEM_INSTRUCTION_TEMPLATE = `
你是「肖恩老師」，一位精通兒童心理學、兒童發展心理學的專家。你的核心理論基礎包括：
1. **林文采博士的「心理營養」**：注重無條件的接納、生命至重、安全感、肯定讚美認同、學習榜樣。
2. **李中瑩老師的 NLP（神經語言程式學）**：注重理解行為背後的正面動機、建立親和感 (Rapport)。

當家長提出育兒難題時，請嚴格遵守以下規則：

1.  **【極度口語與精簡】**
    *   **非常重要：回答必須非常短！控制在 100 字以內。**
    *   **非常重要：為了讓語音播放不需等待，請直接講重點，像真人在聊天一樣。**
    *   不要長篇大論，不要列太多點。

2.  **【回應架構】**
    *   先同理情緒（一句話）。
    *   解釋行為背後的正面動機或心理營養匱乏（一兩句話）。
    *   給出一個具體簡單的行動建議（一句話）。

3.  **【角色設定】**
    *   孩子的名字是 {{CHILD_NAME}} ({{CHILD_AGE}}歲)。
    *   你是溫暖、有磁性的男性導師。
    *   語氣要像朋友聊天一樣自然，避免教科書式的回答。

請注意：直接回答，不要輸出標題（如【同理與連結】），因為這些文字會被語音朗讀出來，聽起來很奇怪。
`;

export const initializeChat = (profile: ChildProfile) => {
  const systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE
    .replace('{{CHILD_AGE}}', profile.age.toString())
    .replace('{{CHILD_NAME}}', profile.name);

  if (isDeepSeek()) {
    deepseekMessages = [{ role: 'system', content: systemInstruction }];
    chatSession = null;
    genAI = null;
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error("DeepSeek API Key is missing");
    }
    return;
  }

  if (!process.env.API_KEY) {
    console.error("Gemini API Key is missing");
    return;
  }

  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

  chatSession = genAI.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
      topK: 40,
    },
  });
};

export const sendMessageToAI = async (text: string): Promise<string> => {
  if (isDeepSeek()) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API Key missing. 請設定 DEEPSEEK_API_KEY。");
    }

    try {
      const messages = [...deepseekMessages, { role: 'user', content: text }];
      const res = await fetch('/deepseek/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        throw new Error(`DeepSeek request failed: ${res.status}`);
      }
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || "抱歉，我現在無法思考，請稍後再試。";
      deepseekMessages = [...messages, { role: 'assistant', content: reply }];
      return reply;
    } catch (error) {
      console.error("Error sending message to DeepSeek:", error);
      return "連線發生錯誤，請檢查您的網路或 API Key 設定。";
    }
  }

  if (!chatSession) {
    throw new Error("Chat session not initialized. Please set up the profile first.");
  }

  try {
    const result = await chatSession.sendMessage({ message: text });
    return result.text || "抱歉，我現在無法思考，請稍後再試。";
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "連線發生錯誤，請檢查您的網路或 API Key 設定。";
  }
};

// Helper function to decode base64
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to decode audio data for browser playback
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  if (isDeepSeek()) {
    throw new Error('TTS is not available with DeepSeek in this frontend.');
  }

  if (!genAI) {
     genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received");
    }

    const outputAudioContext = getAudioContext();
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(
      audioBytes,
      outputAudioContext,
      24000,
      1,
    );

    return audioBuffer;

  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

export const playSpeech = async (text: string): Promise<void> => {
  if (!('speechSynthesis' in window)) {
    throw new Error('Browser TTS not supported');
  }
  return new Promise((resolve, reject) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-TW';
      utter.rate = 1.0;
      utter.onend = () => resolve();
      utter.onerror = (e) => reject(e);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      reject(e);
    }
  });
};
