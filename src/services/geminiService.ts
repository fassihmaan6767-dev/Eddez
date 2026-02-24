
import { KnowledgeItem, Message, UserSettings } from "../types";

// ============================================================================
// CONFIGURATION
// ============================================================================

// SECURITY UPDATE: API Key removed from client-side code.
// It is now stored securely in Vercel Environment Variables (GROQ_API_KEY).

// 1. PRIMARY MODEL
const PRIMARY_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// 2. FALLBACK MODEL
const FALLBACK_MODEL = "llama-3.3-70b-versatile";

// POINT TO OUR INTERNAL VERCEL PROXY INSTEAD OF EXTERNAL URL
const API_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${API_URL}/api/chat`;

// ============================================================================
// CORE API FUNCTION (Calls Internal Proxy)
// ============================================================================
async function callGroqAPI(messages: any[]) {
  
  const sendRequest = async (model: string) => {
    // Calls our local Vercel function /api/chat
    return await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1024,
        top_p: 0.8,
      })
    });
  };

  try {
    let response = await sendRequest(PRIMARY_MODEL);

    // If Primary fails, try Fallback
    if (!response.ok) {
        console.warn(`Primary model failed. Switching to fallback...`);
        response = await sendRequest(FALLBACK_MODEL);
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Handle specific server errors
        if (response.status === 500 && errorData.error?.includes("Missing API Key")) {
             throw new Error("Server Error: API Key not configured in Vercel.");
        }
        throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response.";

  } catch (error) {
    console.error("Network/API Failure:", error);
    throw error;
  }
}

// ============================================================================
// EXPORTED SERVICES
// ============================================================================

export async function generateChatTitle(firstMessage: string): Promise<string> {
  try {
    const messages = [{ role: "user", content: `Generate a title (max 4 words) for: "${firstMessage}". No quotes.` }];
    const text = await callGroqAPI(messages);
    return text.trim().replace(/^["']|["']$/g, '') || "New Chat";
  } catch (e) {
    return "New Chat";
  }
}

export async function getChatResponse(
  userQuery: string,
  knowledgeBase: KnowledgeItem[],
  history: Message[],
  settings: UserSettings
): Promise<string> {
  
  // 1. Prepare Context
  const kbContext = knowledgeBase.length > 0 
    ? knowledgeBase.map((item, index) => {
        let entry = `
### ENTRY ${index + 1}:
**TOPIC:** ${item.topic}
**CONTENT:** ${item.content}`;
        
        if (item.buttonName && item.buttonUrl) {
           entry += `\n**LINKED ACTION:** [ACTION_BUTTON:${item.buttonName}|${item.buttonUrl}]`;
        }
        return entry;
      }).join('\n\n')
    : "No Data.";

  // 2. Settings
  const toneInstruction = settings.tone === 'casual' ? "Tone: Friendly, casual." : "Tone: Professional, direct.";
  
  // 3. STRICT LANGUAGE LOGIC
  const languageDirective = settings.language === 'roman_urdu'
    ? `
**CRITICAL LANGUAGE RULE (ROMAN URDU ONLY):**
1. **WHAT TO DO:** You MUST speak Urdu but write it using **ENGLISH ALPHABETS** (Roman Urdu).
   - Correct Example: "Apka order 3 din mein mil jayega."
   - Correct Example: "Shipping bilkul free hai."

2. **WHAT NOT TO DO:** 
   - **DO NOT** write in Urdu Script (like: "آپ کا آرڈر"). This is strictly FORBIDDEN.
   - **DO NOT** write in standard English (like: "Your order will arrive...").
   - **DO NOT** mix scripts. Only use English letters to spell Urdu words.

3. **TRANSLATION:**
   - Read the Data provided in English.
   - Mentally translate the answer into Roman Urdu.
   - Output ONLY the Roman Urdu translation.`
    : `LANGUAGE: Answer primarily in English.`;

  // 4. STRICT SYSTEM PROMPT
  const systemInstruction = `
You are Eddez, a support AI.

DATA:
${kbContext}

**STRICT RULES (READ CAREFULLY):**

1. **NO FAKE BUTTONS:** 
   - You are **PROHIBITED** from generating [ACTION_BUTTON:...] tags unless they are EXACTLY copied from the "LINKED ACTION" line in the Data above.
   - Do NOT invent links. Do NOT create buttons like "Click Here".

2. **SUPPORT BUTTON RULES (CRITICAL):**
   - **MANDATORY:** You MUST output [ACTION_SUPPORT_BUTTON] immediately if the user asks to speak to a "human", "agent", "real person", "support", or "whatsapp", even if you can answer the question yourself.
   - **ALLOWED:** Use [ACTION_SUPPORT_BUTTON] if the answer is completely MISSING from the Data.
   - **BANNED:** Do NOT use it if the user asks a simple question found in the data (unless they specifically asked for a human).

3. **ANSWERING:**
   - Use the DATA provided. If the info is there, answer directly.
   - ${toneInstruction}

${languageDirective}
`;

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    { role: "user", content: userQuery }
  ];

  try {
    return await callGroqAPI(messages);
  } catch (error: any) {
    return `⚠️ Error: ${error.message}`;
  }
}
