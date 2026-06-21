
const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;

export async function parseTasksAndQuestions(text, conversationHistory = [], onProgress) {
  console.log("🚀 Calling Groq...", text);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are a task extraction assistant. Your ONLY job is to extract every individual task, meeting, reminder or event as a SEPARATE item.

STRICT RULES:
- NEVER combine multiple tasks into one
- Each time reference = its own task
- Each action/reminder = its own task
- Task text: max 6 words, clear and specific
- Priority: high (meetings/urgent), medium (general), low (optional)
- Category: work, personal, health, general

EXAMPLE INPUT: "I have a meeting at 2pm, remind me to do ABC task at 6pm and bring protein shake at 9pm"
EXAMPLE OUTPUT:
{"tasks":[{"text":"Meeting — 2pm","priority":"high","category":"work","done":false},{"text":"ABC task — 6pm","priority":"medium","category":"work","done":false},{"text":"Bring protein shake — 9pm","priority":"medium","category":"health","done":false}],"message":"Got it! Added 3 tasks.","question":null}

Return ONLY raw JSON, no markdown, no explanation.`
          },
          ...conversationHistory,
          { role: "user", content: text }
        ],
      }),
    });

    const data = await response.json();
    console.log("✅ Groq:", data);

    if (data.error) throw new Error(data.error.message);

    const raw = data.choices?.[0]?.message?.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      tasks: (parsed.tasks || []).map((task, i) => ({
        ...task,
        id: `t_${Date.now()}_${i}`,
        done: false,
      })),
      question: parsed.question || null,
      message: parsed.message || `Got it! I've noted ${parsed.tasks?.length || 0} tasks.`,
    };

  } catch (err) {
    console.error("❌ Groq failed:", err);
    return {
      tasks: [{ id: `t_${Date.now()}_0`, text: text.slice(0, 50), priority: "medium", category: "general", done: false }],
      question: null,
      message: "Got it!",
    };
  }
}

export async function loadModel(onProgress) {
  onProgress?.("Ready!");
  return true;
}
