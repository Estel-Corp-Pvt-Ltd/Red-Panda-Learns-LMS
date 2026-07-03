// workers/src/lib/game.ts — Gemini response schemas + prompt + validation for
// mini-games. Mirrors src/lib/gameSchema.ts (frontend zod). No zod here by design.

export type Engine = "grid" | "graph" | "timeline";
export type Difficulty = "easy" | "medium" | "hard";

const cellArr = { type: "array", items: { type: "integer" } };

// ── Gemini responseSchema per engine (constrains the JSON shape at the source) ──

const GRID_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    config: {
      type: "object",
      properties: {
        rows: { type: "integer" },
        cols: { type: "integer" },
        player: cellArr,
        goal: cellArr,
        walls: { type: "array", items: cellArr },
        coins: { type: "array", items: cellArr },
        lesson: { type: "string" },
      },
      required: ["rows", "cols", "player", "goal", "walls", "coins", "lesson"],
    },
  },
  required: ["title", "description", "difficulty", "config"],
};

const GRAPH_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    config: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" } }, required: ["id", "label"] },
        },
        edges: {
          type: "array",
          items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, label: { type: "string" } }, required: ["from", "to"] },
        },
        mode: { type: "string" },
        question: { type: "string" },
        answer: { type: "array", items: { type: "string" } },
        explanation: { type: "string" },
      },
      required: ["nodes", "edges", "mode", "question", "answer"],
    },
  },
  required: ["title", "description", "difficulty", "config"],
};

const TIMELINE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    config: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" }, year: { type: "string" } }, required: ["id", "label"] },
        },
        correctOrder: { type: "array", items: { type: "string" } },
        question: { type: "string" },
      },
      required: ["events", "correctOrder"],
    },
  },
  required: ["title", "description", "difficulty", "config"],
};

const SCHEMAS: Record<Engine, object> = { grid: GRID_SCHEMA, graph: GRAPH_SCHEMA, timeline: TIMELINE_SCHEMA };

const ENGINE_BRIEF: Record<Engine, string> = {
  grid: `A maze on a rows×cols grid. Player starts at [row,col], must reach goal, collecting coins. Use walls to shape a solvable maze. Good for Reinforcement Learning / Q-learning, Search Algorithms (BFS/DFS/A*), pathfinding. Ensure a wall-free path exists from player to goal.`,
  graph: `A node/edge diagram. Pose a "question" and give "answer" as the array of node id(s) the learner must click to be correct. mode is a free tag like "bayesian", "decisionTree", or "neuralNet". Good for Bayesian Networks, Decision Trees, Neural Network structure. Every answer id and every edge from/to MUST reference an existing node id.`,
  timeline: `An ordering puzzle. Give 4-6 "events" (shuffled) and "correctOrder" as the array of event ids in the true chronological/logical order. Good for AI history (Perceptron→AlexNet→Transformer...), training-pipeline steps, or algorithm phases. correctOrder MUST contain exactly the event ids, each once.`,
};

export function responseSchema(engine: Engine, count: number): object {
  return { type: "array", items: SCHEMAS[engine], minItems: count, maxItems: count };
}

export function buildPrompt(engine: Engine, difficulty: Difficulty, count: number): string {
  return [
    `You design short (2-3 min) educational mini-games teaching AI concepts for the "${engine}" game engine.`,
    ENGINE_BRIEF[engine],
    `Produce ${count} DISTINCT ${difficulty} game(s), each teaching a DIFFERENT AI concept.`,
    `Make them fun, concrete, and solvable. Titles and descriptions should be catchy and student-friendly.`,
    `Return ONLY a JSON array matching the provided schema. difficulty must be "${difficulty}".`,
  ].join("\n");
}

// ── Hand-rolled validation (integrity checks the schema can't express) ──────────

const isCell = (v: any) => Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]) && Number.isInteger(v[1]);
const inBounds = (c: any, rows: number, cols: number) => c[0] >= 0 && c[0] < rows && c[1] >= 0 && c[1] < cols;

/** Return the validated game (normalized) or a reason string if invalid. */
export function validateGame(g: any, engine: Engine): { ok: true; game: any } | { ok: false; reason: string } {
  if (!g || typeof g !== "object") return { ok: false, reason: "not an object" };
  if (!g.title || !g.description) return { ok: false, reason: "missing title/description" };
  if (!["easy", "medium", "hard"].includes(g.difficulty)) return { ok: false, reason: "bad difficulty" };
  const cfg = g.config;
  if (!cfg || typeof cfg !== "object") return { ok: false, reason: "missing config" };

  if (engine === "grid") {
    const { rows, cols, player, goal } = cfg;
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 3 || cols < 3 || rows > 20 || cols > 20)
      return { ok: false, reason: "bad rows/cols" };
    if (!isCell(player) || !isCell(goal)) return { ok: false, reason: "bad player/goal" };
    if (!inBounds(player, rows, cols) || !inBounds(goal, rows, cols)) return { ok: false, reason: "player/goal out of bounds" };
    cfg.walls = Array.isArray(cfg.walls) ? cfg.walls.filter((c: any) => isCell(c) && inBounds(c, rows, cols)) : [];
    cfg.coins = Array.isArray(cfg.coins) ? cfg.coins.filter((c: any) => isCell(c) && inBounds(c, rows, cols)) : [];
    if (!cfg.lesson) return { ok: false, reason: "missing lesson" };
    if (!gridSolvable(rows, cols, player, goal, cfg.walls)) return { ok: false, reason: "maze not solvable" };
  } else if (engine === "graph") {
    const nodes = cfg.nodes, edges = cfg.edges ?? [], answer = cfg.answer;
    if (!Array.isArray(nodes) || nodes.length < 2) return { ok: false, reason: "need >=2 nodes" };
    const ids = new Set(nodes.map((n: any) => n?.id));
    if (ids.size !== nodes.length) return { ok: false, reason: "duplicate node ids" };
    if (!cfg.question || !cfg.mode) return { ok: false, reason: "missing question/mode" };
    if (!Array.isArray(answer) || answer.length < 1 || !answer.every((a: any) => ids.has(a)))
      return { ok: false, reason: "answer refs unknown node" };
    if (Array.isArray(edges) && !edges.every((e: any) => ids.has(e?.from) && ids.has(e?.to)))
      return { ok: false, reason: "edge refs unknown node" };
    cfg.edges = edges ?? [];
  } else if (engine === "timeline") {
    const events = cfg.events, order = cfg.correctOrder;
    if (!Array.isArray(events) || events.length < 3) return { ok: false, reason: "need >=3 events" };
    const ids = events.map((e: any) => e?.id);
    if (new Set(ids).size !== ids.length) return { ok: false, reason: "duplicate event ids" };
    if (!Array.isArray(order) || order.length !== ids.length) return { ok: false, reason: "order length mismatch" };
    const sortedA = [...ids].sort(), sortedB = [...order].sort();
    if (sortedA.join("|") !== sortedB.join("|")) return { ok: false, reason: "correctOrder != event ids" };
  } else {
    return { ok: false, reason: "unknown engine" };
  }

  return { ok: true, game: { ...g, engine } };
}

/** BFS: is there a wall-free 4-neighbour path from player to goal? */
function gridSolvable(rows: number, cols: number, player: number[], goal: number[], walls: number[][]): boolean {
  const blocked = new Set(walls.map((w) => `${w[0]},${w[1]}`));
  const key = (r: number, c: number) => `${r},${c}`;
  if (blocked.has(key(player[0], player[1])) || blocked.has(key(goal[0], goal[1]))) return false;
  const seen = new Set([key(player[0], player[1])]);
  const q: number[][] = [player];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const [r, c] = q.shift()!;
    if (r === goal[0] && c === goal[1]) return true;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const k = key(nr, nc);
      if (seen.has(k) || blocked.has(k)) continue;
      seen.add(k);
      q.push([nr, nc]);
    }
  }
  return false;
}
