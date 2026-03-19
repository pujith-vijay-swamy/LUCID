export interface SentimentResult {
  sentiment: number; // -1 to 1
  stressors: string[];
  response: string;
  isCrisis: boolean;
}

export async function getCounselorResponse(message: string, history: { role: string; content: string }[]): Promise<SentimentResult> {
  const model = "nvidia/nemotron-3-nano-30b-a3b:free"; // Default OpenRouter model

  const systemInstruction = `
    You are an empathetic AI counselor. Your goal is to provide a safe, private, and calming space for people to vent and seek support.
    
    CRITICAL: If the user mentions self-harm, suicide, or high-risk crisis situations, you MUST set 'isCrisis' to true. In these cases, your response MUST be extremely supportive, validating, and life-affirming. You should gently motivate the user to seek help and remind them of their worth, while remaining calm and non-judgmental.
    
    Analyze the user's message for:
    1. Sentiment: A score from -1 (extremely stressed/sad) to 1 (extremely happy/calm).
    2. Stressors: Identify specific keywords causing stress (e.g., "work", "sleep", "relationships", "finances").
    
    Respond in a JSON format:
    {
      "sentiment": number,
      "stressors": string[],
      "response": "Your empathetic response here",
      "isCrisis": boolean
    }
  `;

  try {
    const apiKey = (import.meta as any).env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Lucid AI Counselor"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemInstruction },
          ...history.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
          })),
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return {
        sentiment: 0,
        stressors: [],
        response: `OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}. Check your API key.`,
        isCrisis: false
      };
    }

    const resultContent = data.choices?.[0]?.message?.content || "{}";

    // Extract JSON from markdown or extra text if model didn't reply cleanly
    let jsonStr = resultContent;
    const startIndex = jsonStr.indexOf('{');
    const endIndex = jsonStr.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = jsonStr.substring(startIndex, endIndex + 1);
    }

    try {
      const result = JSON.parse(jsonStr || "{}");
      return result;
    } catch (parseError: any) {
      return {
        sentiment: 0,
        stressors: [],
        response: `Failed to parse AI response as JSON. Raw response: ${resultContent}`,
        isCrisis: false
      };
    }
  } catch (e: any) {
    console.error("Failed to generate or parse AI response via OpenRouter:", e);
    return {
      sentiment: 0,
      stressors: [],
      response: `Technical Error: ${e.message || String(e)}`,
      isCrisis: false
    };
  }
}
