import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8787;

const systemPrompt = `You are SkillBridge, a thoughtful learning-path designer. Create realistic, sequenced learning roadmaps for students. Respect their current skills, target role, time available and duration. Do not promise jobs or guaranteed outcomes. Prefer fundamentals before advanced topics. Include hands-on work and review time. Return ONLY valid JSON matching this schema:
{
 "title": string, "summary": string, "estimatedWeeks": number,
 "phases": [{
   "name": string, "duration": string, "outcome": string, "why": string,
   "topics": [{"name": string, "description": string, "hours": number, "type": "learn"|"practice"|"project"}],
   "project": string,
   "resources": [{"name": string, "url": string, "kind": string}]
 }]
}
Use only trustworthy resource URLs you know with high confidence. If unsure, provide the resource name and an empty url. Make phases fit the requested duration.`;

function demoRoadmap(input) {
  const role = input.targetRole || "Software Developer";
  const skill = input.currentSkills || "the fundamentals";
  const duration = Number(input.durationWeeks || 12);
  const phasesCount = Math.min(5, Math.max(3, Math.ceil(duration / 4)));
  const templates = [
    ["Foundations", "Build a reliable base", "Understand the core concepts and tools.", "Set up your environment and create a small fundamentals project.", [
      ["Core concepts", "Learn the essential concepts for your target role.", 8, "learn"],
      ["Developer workflow", "Practice using documentation, Git and a code editor.", 5, "practice"],
      ["Foundation mini-project", "Build a small project that uses the concepts learned.", 7, "project"]
    ]],
    ["Core skills", "Turn concepts into practical ability", "Move from understanding to solving real tasks.", "Create a practical application using the main skills for your target role.", [
      ["Language and platform skills", "Study the most relevant tools for your chosen path.", 10, "learn"],
      ["Problem solving", "Practice progressively harder exercises.", 8, "practice"],
      ["Applied project", "Build a useful project and document your decisions.", 10, "project"]
    ]],
    ["Build and integrate", "Connect the pieces", "Learn how real applications are structured.", "Build an end-to-end project with a clear user workflow.", [
      ["Application architecture", "Understand how the major components work together.", 8, "learn"],
      ["Integration practice", "Connect components and handle common errors.", 8, "practice"],
      ["End-to-end build", "Build and test a complete small application.", 12, "project"]
    ]],
    ["Portfolio and polish", "Show what you can do", "Prepare work that demonstrates your skills.", "Polish one portfolio project and publish its source code.", [
      ["Testing and quality", "Test edge cases and improve code quality.", 6, "learn"],
      ["Portfolio project", "Improve the project based on feedback.", 12, "project"],
      ["Explain your work", "Write a README and prepare a short demo.", 4, "practice"]
    ]],
    ["Next-step readiness", "Keep progressing independently", "Identify gaps and plan the next learning cycle.", "Choose a stretch project based on your remaining skill gaps.", [
      ["Review and revise", "Revisit difficult topics and fill knowledge gaps.", 6, "practice"],
      ["Stretch project", "Apply your skills to a more open-ended problem.", 12, "project"],
      ["Career preparation", "Prepare a portfolio walkthrough and learning reflection.", 4, "practice"]
    ]]
  ];
  const phases = Array.from({length: phasesCount}, (_, i) => {
    const t = templates[Math.min(i, templates.length - 1)];
    return {
      name: t[0], duration: `${Math.max(1, Math.ceil(duration / phasesCount))} weeks`,
      outcome: t[1], why: t[2], project: t[3],
      topics: t[4].map(([name, description, hours, type], j) => ({
        id: `p${i+1}-t${j+1}`, name, description: `${description} Starting point: ${skill}.`,
        hours: Math.max(1, Math.round(hours * (duration / 12))), type, completed: false
      })),
      resources: [
        { name: "Official documentation", url: "", kind: "Reference" },
        { name: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/", kind: "Free course" }
      ]
    };
  });
  return {
    title: `${role} Learning Roadmap`,
    summary: `A ${duration}-week starter plan designed around your current knowledge (${skill}) and available study time of ${input.hoursPerDay || 1} hour(s) per day. This is a demo plan; personalize it further as you learn.`,
    estimatedWeeks: duration, phases
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, gemmaConfigured: Boolean(process.env.GEMMA_API_KEY && process.env.GEMMA_API_URL && process.env.GEMMA_MODEL) });
});

app.post("/api/roadmap", async (req, res) => {
  const input = req.body || {};
  if (!input.targetRole || !input.durationWeeks) {
    return res.status(400).json({ error: "Please provide a target role and learning duration." });
  }
  const configured = process.env.GEMMA_API_KEY && process.env.GEMMA_API_URL && process.env.GEMMA_MODEL;
  if (!configured) {
    return res.json({ roadmap: demoRoadmap(input), mode: "demo", notice: "Demo roadmap shown. Add the official Gemma API settings to enable live AI generation." });
  }
  try {
    const response = await fetch(process.env.GEMMA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GEMMA_API_KEY}` },
      body: JSON.stringify({
        model: process.env.GEMMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a roadmap for these details:\n${JSON.stringify(input)}` }
        ],
        temperature: 0.4
      })
    });
    if (!response.ok) throw new Error(`Gemma API returned ${response.status}: ${await response.text()}`);
    const payload = await response.json();
    const raw = payload.choices?.[0]?.message?.content ?? payload.output ?? payload.response;
    if (!raw) throw new Error("The configured Gemma endpoint returned an unexpected response format.");
    const cleaned = String(raw).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const roadmap = JSON.parse(cleaned);
    if (!Array.isArray(roadmap.phases)) throw new Error("Gemma response did not contain roadmap phases.");
    roadmap.phases = roadmap.phases.map((p, i) => ({
      ...p, topics: (p.topics || []).map((t, j) => ({ ...t, id: `p${i+1}-t${j+1}`, completed: false }))
    }));
    res.json({ roadmap, mode: "gemma" });
  } catch (error) {
    console.error("Roadmap generation failed:", error);
    res.status(502).json({ error: "Gemma couldn't generate the roadmap right now. Please retry, or use demo mode.", detail: error.message });
  }
});

app.listen(PORT, () => console.log(`SkillBridge API running on http://localhost:${PORT}`));
