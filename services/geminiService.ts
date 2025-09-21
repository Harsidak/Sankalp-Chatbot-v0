
// integrated_ai_client.ts
// Unified AI client that supports either GoogleGenAI (Gemini) via API key
// or Firebase Vertex AI GenerativeModel (deployed tuned model endpoint).

// integrated_ai_client.ts
// Unified AI client that supports either GoogleGenAI (Gemini) via API key
// or Firebase Vertex AI GenerativeModel (deployed tuned model endpoint).

// integrated_ai_client.ts
// Unified AI client that supports either GoogleGenAI (Gemini) via API key
// or Firebase Vertex AI GenerativeModel (deployed tuned model endpoint).
// integrated_ai_client.ts
// Unified AI client that supports either GoogleGenAI (Gemini) via API key
// or Firebase Vertex AI GenerativeModel (deployed tuned model endpoint).

// integrated_ai_client.ts
// Unified AI client that supports either GoogleGenAI (Gemini) via API key
// or Firebase Vertex AI GenerativeModel (deployed tuned model endpoint).

// integrated_ai_client.ts
// Unified AI client that supports either GoogleGenAI (Gemini) via API key
// or Firebase Vertex AI GenerativeModel (deployed tuned model endpoint).

import type { UserSelections, ChatMessage, ChatSession, WellnessPlan, DashboardAnalytics } from '../types';
import { MessageAuthor } from '../types';
import { LANGUAGES, EMOTIONS } from '../constants';
import type { FirebaseApp } from 'firebase/app';

// NOTE: Do NOT statically import 'firebase/vertexai' in a browser-bundled frontend (Vite).
// The "Missing \"./vertexai\" specifier" error occurs because 'firebase' package does not export
// the './vertexai' subpath for ESM bundlers. To avoid Vite import-analysis failures we load
// the Vertex client dynamically at runtime inside setFirebaseVertexModel (server or secure env).

let vertexModel: any = null; // runtime-loaded
let vertexLocation = 'us-central1';
// Default to env if provided, otherwise use your provided endpoint path (no secrets embedded)
let vertexModelResource = (import.meta as any)?.env?.VITE_VERTEX_MODEL_ENDPOINT || process.env.VITE_VERTEX_MODEL_ENDPOINT || "projects/756307450344/locations/us-central1/endpoints/1417678407017168896";

/**
 * Inject a Gemini / GoogleGenAI API key at runtime.
 * Call this from secure bootstrap code (server-backend or secure env) rather than embedding
 * raw keys in client-side source. Example:
 *   setGeminiApiKey(process.env.VITE_GEMINI_API_KEY);
 */

/**
 * Configure and initialize the Vertex AI GenerativeModel at runtime.
 * This performs a dynamic import of 'firebase/vertexai' to avoid Vite bundler issues.
 * Note: dynamic import may still fail in pure-browser environments. Move Vertex calls server-side for production.
 */
export async function setFirebaseVertexModel(firebaseApp: FirebaseApp, options?: { location?: string; modelEndpoint?: string; generationConfig?: any; safetySettings?: any[] }) {
  vertexLocation = options?.location || vertexLocation;
  vertexModelResource = options?.modelEndpoint || vertexModelResource;
  if (!vertexModelResource) {
    throw new Error('Missing Vertex model endpoint resource. Provide modelEndpoint or set VITE_VERTEX_MODEL_ENDPOINT.');
  }

  let vertexModule: any;
  try {
    // Use runtime dynamic import via Function constructor to avoid bundler analysis entirely.
    const importer: (s: string) => Promise<any> = (new Function('s', 'return import(s)')) as any;
    vertexModule = await importer('firebase/compat/vertexai');
  } catch (err) {
    console.error('Dynamic import of firebase/vertexai failed. Move Vertex AI calls to server-side.');
    throw err;
  }

  const { getVertexAI, getGenerativeModel, HarmBlockThreshold, HarmCategory } = vertexModule;

  const generationConfig = options?.generationConfig || {
    temperature: 1,
    topP: 0.95,
    maxOutputTokens: 65535,
  };
  const safetySettings = options?.safetySettings || [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.OFF },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.OFF },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.OFF },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
  ];

  const vertexAI = getVertexAI(firebaseApp, { location: vertexLocation });
  vertexModel = getGenerativeModel(vertexAI, {
    model: vertexModelResource,
    generationConfig,
    safetySettings,
  });
}


// Unified response text reader
const getResponseText = async (response: any): Promise<string> => {
  try {
    if (!response) return '';
    // Vertex AI shaped response: response.response.text()
    if (typeof response?.response?.text === 'function') return await response.response.text();
    // Google GenAI shaped response: response.text() or response.text
    if (typeof response?.text === 'function') return await response.text();
    if (typeof response?.text === 'string') return response.text;
    if (typeof response === 'string') return response;
  } catch (e) {
    // swallow
  }
  return '';
};

const getSystemInstruction = (languageName: string): string => {
  return `You are Sankalp, a compassionate, empathetic, and supportive AI mental health assistant designed for young people. Your primary goal is to provide a safe, non-judgmental space for users to express their feelings. Use simple, encouraging, and age-appropriate language. You should actively listen, validate their feelings, and offer gentle guidance and coping strategies. Do NOT provide medical advice or medical drug, diagnoses, or clinical terminology. If a user expresses thoughts of self-harm or is in immediate danger, gently but clearly encourage them to speak to a trusted adult, a crisis hotline, or emergency services immediately. Your persona is warm, patient, and understanding, like a supportive older sibling or a trusted mentor. Your response MUST be exclusively in ${languageName}. Do not switch languages under any circumstances.
    Make sure to detect the situation and emotions the user is facing
    If the user express  negative emotions
    Start with comfort and validation.
    Example: “I’m really sorry you’re feeling this way. You’re not alone—I’m here for you.”
    Ask for details if the user hasn’t shared enough.
    Example: “Can you tell me more about what’s been going on? When did this start? How have things changed over time?”
    Ask about substance or drug use.
    Example: “Have you used alcohol, tobacco, cannabis, stimulants, opioids, sedatives, or prescription medications recently or in the past? How much and how often?”
    Check for medical conditions.
    Example: “Do you have any medical issues like hormonal problems, heart disease, neurological issues, or others that might affect how you feel?”
    Ask about routine and family history.
    Example: “Can you tell me about your daily routine, your sleep pattern, and what you eat? Has anyone in your family experienced similar problems?”
    Ask about safety concerns.
    Example: “Have you had thoughts about hurting yourself or someone else? Do you experience any frightening or negative thoughts?”
    Speak in a loving and supportive way.
    Avoid judgmental language.
    Provide hope and solutions at the end.
    Offer solutions and coping strategies once all information is gathered.
    If the user asks unrelated questions, answer clearly without losing focus.
    If the user express  positive emotions

    Start by acknowledging and celebrating their emotion.
    Example: “That’s wonderful to hear! It’s great that you’re feeling so happy and excited.”

    Encourage the user to share more if they want.
    Example: “Would you like to tell me more about what made you feel this way?”

    Skip asking about substance use, medical conditions, or routine unless the user brings them up.

    Focus on reinforcing positive coping strategies.
    Example: “It’s important to enjoy moments like these and take care of yourself.”

    Offer further support if needed.
    Example: “If you ever feel differently or want to talk, I’m always here.”

    Respond in a cheerful, encouraging tone without being overbearing.`;
};

const mapMessagesToContent = (messages: ChatMessage[]): Array<string> => {
  // For Vertex model we'll send a combined string containing history.
  return messages.map(message => `${message.author === MessageAuthor.USER ? 'User' : 'Assistant'}: ${message.text}`);
};

// Unified generator function: requires Vertex model configuration
async function generateContentUnified(prompt: string, options?: { languageName?: string; config?: any; responseSchema?: any }): Promise<string> {
  if (!vertexModel) {
    throw new Error('Vertex model not configured. Ensure setFirebaseVertexModel(firebaseApp, options) is called during app startup.');
  }
  const result = await vertexModel.generateContent(prompt);
  const text = await getResponseText(result);
  return text;
}

// --- Public API functions (same names as original module) ---
export const createChat = (languageCode: string, history: ChatMessage[] = []): any => {
  const languageName = LANGUAGES.find(l => l.code === languageCode)?.name || 'English';

  // deep copy
  const historyCopy = JSON.parse(JSON.stringify(history));

  // If no AI configured, return mock
  if (!vertexModel) {
    const mockChat: any = {
      __isMock: true,
      async *sendMessageStream({ message }: { message: string }) {
        const canned = `I hear you. Let's talk about: "${message}". I’m here to listen.`;
        yield { text: canned.slice(0, Math.ceil(canned.length / 2)) };
        yield { text: canned };
      },
    };
    return mockChat as any;
  }

  // Return a minimal chat wrapper that exposes sendMessageStream similar behaviour.
  const chatWrapper: any = {
    async *sendMessageStream({ message }: { message: string }) {
      const promptParts = historyCopy.length ? mapMessagesToContent(historyCopy).join('\n') + '\n' : '';
      const prompt = `${getSystemInstruction(languageName)}\nConversation history:\n${promptParts}User: ${message}\nRespond in ${languageName}.`;

      try {
        const fullText = await generateContentUnified(prompt, { languageName });
        // mimic partial streaming: emit half then full
        const half = fullText.slice(0, Math.ceil(fullText.length / 2));
        yield { text: half };
        yield { text: fullText };
      } catch (err) {
        const fallback = `I’m here to listen. (Fallback response in ${languageName})`;
        yield { text: fallback };
      }
    },
  };

  return chatWrapper as any;
};

export const generateInitialMessage = async (selections: UserSelections): Promise<string> => {
  const languageName = LANGUAGES.find(l => l.code === selections.language)?.name || 'English';

  const englishEmotionNames = selections.emotions.map(key => {
    const emotion = EMOTIONS.find(e => e.key === key);
    return emotion ? emotion.en : key;
  });

  const prompt = `A user in the '${selections.ageGroup}' age group is feeling the following emotions: ${englishEmotionNames.join(', ')}. They've rated the intensity of these feelings as ${selections.intensity} out of 10. Please provide a warm, empathetic, and reassuring opening message based on this, in the ${languageName} language. Acknowledge their feelings, validate their experience, and gently invite them to talk more about what's on your mind. Let them know you're here to listen without judgment.`;

  try {
    const text = await generateContentUnified(prompt, { languageName });
    if (!text) throw new Error('Empty response');
    return text;
  } catch (error) {
    console.error('Error generating initial message:', error);
    return `Hi there. I’m here to listen and support you. How are you feeling today? (Response is in ${languageName}).`;
  }
};

export const generateChatTitle = async (session: ChatSession): Promise<string> => {
  if (session.messages.length < 2) {
    const emotionNames = session.selections.emotions.map(key => {
      const emotion = EMOTIONS.find(e => e.key === key);
      return emotion ? emotion.en : key;
    });
    return emotionNames.slice(0, 3).join(', ');
  }

  const languageName = LANGUAGES.find(l => l.code === session.selections.language)?.name || 'English';
  const conversation = session.messages.map(m => `${m.author}: ${m.text}`).join('');
  const prompt = `Based on the following conversation start, create a very short, concise title (4-5 words max) in ${languageName} that captures the main theme. Do not use quotes or special characters.

Conversation:
${conversation}`;

  try {
    const text = await generateContentUnified(prompt, { languageName });
    const cleaned = text.trim().replace(/[\"']/g, '');
    if (!cleaned) throw new Error('Empty response');
    return cleaned;
  } catch (error) {
    console.error('Error generating title:', error);
    const emotionNames = session.selections.emotions.map(key => {
      const emotion = EMOTIONS.find(e => e.key === key);
      return emotion ? emotion.en : key;
    });
    return emotionNames.slice(0, 2).join(', ');
  }
};

export const generateWellnessPlan = async (languageCode: string): Promise<WellnessPlan> => {
  const languageName = LANGUAGES.find(l => l.code === languageCode)?.name || 'English';
  const userContext = { name: 'Alex', emotion: 'negative', issues: 'stress, sleep issues', preferences: 'meditation, journaling', time: '30 minutes', streaks: '2 days' };
  const prompt = `You are an expert wellness coach. Create a personalized, gamified self-care plan for the user.
User: Name: ${userContext.name}, Emotional state: ${userContext.emotion}, Issues: ${userContext.issues}, Preferences: ${userContext.preferences}, Time: ${userContext.time}, Streak: ${userContext.streaks}.
Tasks:
1. Create a single, realistic **daily challenge**.
2. Suggest a **reward** for it (type: 'points', 'badge', or 'milestone').
3. Design a **streak system**: State current streak, 7-day reward, and encouragement.
4. Offer a short, general **encouragement message**.
5. Generate a **weekly challenge** with a reward and a specific 'goalDays' (number between 3-7).
The challenges must be calming and simple due to stress. Be supportive.
Return ONLY the specified JSON. All text in the response must be in ${languageName}.`;

  const wellnessPlanSchema = {
    type: 'object',
    properties: {
      dailyChallenge: { type: 'object' },
      streakInfo: { type: 'object' },
      weeklyChallenge: { type: 'object' },
      encouragement: { type: 'string' },
    },
    required: ['dailyChallenge', 'streakInfo', 'weeklyChallenge', 'encouragement'],
  };

  try {
    const text = await generateContentUnified(prompt, { languageName, responseSchema: wellnessPlanSchema });
    const jsonText = text.trim();
    return JSON.parse(jsonText) as WellnessPlan;
  } catch (error) {
    console.error('Error generating wellness plan:', error);
    throw new Error('Failed to generate wellness plan from AI API.');
  }
};

export const generateDashboardAnalytics = async (languageCode: string): Promise<DashboardAnalytics> => {
  const languageName = LANGUAGES.find(l => l.code === languageCode)?.name || 'English';
  const prompt = `You are a data synthesizer for a wellness app. Generate a realistic but mock analytics summary for a user.
Your Tasks:
1.  **keyMetrics**: Create an object with 'currentStreak' (number between 2-10) and 'challengesCompleted' (number between 5-20).
2.  **moodTrend**: Create an array of 7 objects. Each object should have a 'day' (e.g., "Mon", "Tue") and a 'moodScore' (a number between 1 and 10, showing some variation).
3.  **emotionBreakdown**: Create an array of 3-4 objects. Each object should have an 'emotion', a 'percentage' (all percentages must sum to 100), and a 'color' (a hex code like '#8B5CF6').
4.  **activityLog**: Create an array of 2-3 recent activity objects. Each should have a 'date' and an 'activity'.

Return ONLY the specified JSON. All text fields (emotion, date, activity) must be in ${languageName}.`;

  const analyticsSchema = {
    type: 'object',
    properties: {},
  };

  try {
    const text = await generateContentUnified(prompt, { languageName, responseSchema: analyticsSchema });
    const jsonText = text.trim();
    return JSON.parse(jsonText) as DashboardAnalytics;
  } catch (error) {
    console.error('Error generating dashboard analytics:', error);
    throw new Error('Failed to generate dashboard analytics from AI API.');
  }
};

// Example helper: call vertexModel directly (raw) if needed
export async function callVertexRaw(content: string | Array<any>) {
  if (!vertexModel) throw new Error('Vertex model not configured. Call setFirebaseVertexModel(firebaseApp, options) first.');
  return await vertexModel.generateContent(content as any);
}

// Exported for backwards compatibility
export default {
  createChat,
  generateInitialMessage,
  generateChatTitle,
  generateWellnessPlan,
  generateDashboardAnalytics,
  setFirebaseVertexModel,
  callVertexRaw,
};
