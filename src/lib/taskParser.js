const GROQ_KEY = "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";

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
            content: `You are a task extraction assistant. Extract EVERY task, meeting, appointment or event as a SEPARATE task.

RULES:
- Every time reference = separate task
- Every person/group = separate task
- Title: max 6 words, include person and time
- Good: "Meeting with ABS — 11am", "Meeting with Rahul — 2pm", "Lunch with ABS", "Meeting with Karishma — 6pm"

Return ONLY raw JSON, no markdown:
{"tasks":[{"id":"t_1","text":"Meeting with ABS — 11am","priority":"medium","category":"work","done":false},{"id":"t_2","text":"Meeting with Rahul — 2pm","priority":"medium","category":"work","done":false}],"question":"Would you like reminders before your meetings?","message":"Got it! I've noted 4 tasks."}`
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
