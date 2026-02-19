import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import express from "express";
import { readFileSync } from "fs";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Load .env manually (avoid dotenv dependency)
// ---------------------------------------------------------------------------
try {
  const envFile = readFileSync(path.join(__dirname, ".env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env is optional – user may export vars directly
}

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3456;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let mcpClient;
let openaiTools = []; // converted tool schemas

const sessions = new Map(); // sessionId → { messages[], lastAccess }
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

const SYSTEM_PROMPT = `You are the Vizuara Admin Assistant – an AI that manages an online learning platform.
You can create and update courses, manage enrollments, search users, grade submissions, and more.
Use the available tools to fulfill requests. When creating courses, always confirm what was created.
Be concise and helpful. If a request is ambiguous, ask for clarification before taking action.

Today's date is ${new Date().toISOString().split("T")[0]}. Use this when computing relative date ranges like "last 5 days", "last month", etc. Always convert relative dates to ISO strings for the fromDate/toDate parameters.

IMPORTANT: When the user asks for a list of items, ALWAYS show ALL results returned by the tool. Never truncate, summarize, or say "and many more". If a tool returns 50 results, list all 50. When you suspect there may be more results beyond the limit, set a higher limit (up to 500) in the tool call, and tell the user the total count returned.`;

// ---------------------------------------------------------------------------
// MCP Client
// ---------------------------------------------------------------------------
async function connectMCP() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(ROOT_DIR, "mcp-server/dist/index.js")],
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: path.join(ROOT_DIR, "mcp-server/service-account.json"),
    },
    cwd: ROOT_DIR,
    stderr: "inherit",
  });

  mcpClient = new Client({ name: "vizuara-chatbot", version: "1.0.0" });
  await mcpClient.connect(transport);

  const { tools } = await mcpClient.listTools();
  openaiTools = tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));

  console.log(`MCP connected – ${openaiTools.length} tools available`);
}

// ---------------------------------------------------------------------------
// OpenAI Agentic Tool Loop
// ---------------------------------------------------------------------------
async function runAgentLoop(messages) {
  const MAX_ITERATIONS = 15;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: openaiTools,
      temperature: 0.2,
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;
    messages.push(assistantMsg);

    if (choice.finish_reason !== "tool_calls" || !assistantMsg.tool_calls?.length) {
      return assistantMsg.content || "";
    }

    // Execute every tool call in parallel
    const toolResults = await Promise.all(
      assistantMsg.tool_calls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments);
        try {
          const result = await mcpClient.callTool({ name: tc.function.name, arguments: args });
          const text =
            result.content
              ?.map((c) => (typeof c === "string" ? c : c.text ?? JSON.stringify(c)))
              .join("\n") ?? JSON.stringify(result);
          return { role: "tool", tool_call_id: tc.id, content: text };
        } catch (err) {
          return { role: "tool", tool_call_id: tc.id, content: `Error: ${err.message}` };
        }
      })
    );

    messages.push(...toolResults);
  }

  return "I reached the maximum number of steps. Please try a simpler request.";
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
function getSession(id) {
  if (!id || !sessions.has(id)) {
    id = crypto.randomUUID();
    sessions.set(id, { messages: [{ role: "system", content: SYSTEM_PROMPT }], lastAccess: Date.now() });
  }
  const session = sessions.get(id);
  session.lastAccess = Date.now();
  return { id, session };
}

function cleanupSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastAccess > SESSION_TTL_MS) sessions.delete(id);
  }
}
setInterval(cleanupSessions, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Express
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: mcpClient ? "connected" : "disconnected", tools: openaiTools.length });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const { id, session } = getSession(sessionId);
    session.messages.push({ role: "user", content: message });

    const reply = await runAgentLoop(session.messages);
    res.json({ reply, sessionId: id });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reset", (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) sessions.delete(sessionId);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main() {
  await connectMCP();
  app.listen(PORT, () => console.log(`Chatbot running → http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
