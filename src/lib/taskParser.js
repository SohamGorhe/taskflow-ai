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
        model: "openai/gpt-oss-20b",
        max_tokens: 1000,
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "task_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      category: { type: "string", enum: ["work", "personal", "health", "general"] },
                      done: { type: "boolean" }
                    },
                    required: ["text", "priority", "category", "done"],
                    additionalProperties: false
                  }
                },
                message: { type: "string" },
                question: { type: ["string", "null"] }
              },
              required: ["tasks", "message", "question"],
              additionalProperties: false
            }
          }
        },
        messages: [
          {
            role: "system",
            content: `You are a task extraction assistant. Extract EVERY task, meeting, reminder or event as a SEPARATE item in the tasks array.

RULES:
- Each time mentioned = one separate task
- Each action = one separate task  
- Task text: max 6 words, include time if mentioned
- Priority: high for meetings/urgent, medium for general, low for optional
- Category: work, personal, health, or general`
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
    const parsed = JSON.parse(raw);

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
