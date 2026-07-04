// src/lib/gameSchema.ts — single source of truth for mini-game JSON.
// The worker hand-rolls the same checks (no zod there); keep the two in sync.

import { z } from "zod";

const cell = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);

export const gridConfig = z.object({
  rows: z.number().int().min(3).max(20),
  cols: z.number().int().min(3).max(20),
  player: cell,
  goal: cell,
  walls: z.array(cell).default([]),
  coins: z.array(cell).default([]),
  lesson: z.string().min(1),
});

const node = z.object({ id: z.string().min(1), label: z.string().min(1) });
const edge = z.object({ from: z.string().min(1), to: z.string().min(1), label: z.string().optional() });

export const graphConfig = z.object({
  nodes: z.array(node).min(2),
  edges: z.array(edge).default([]),
  mode: z.string().min(1), // "bayesian" | "decisionTree" | "neuralNet" — free-form tag
  question: z.string().min(1),
  answer: z.array(z.string().min(1)).min(1), // node id(s) the player must select
  explanation: z.string().optional(),
});

const tlEvent = z.object({ id: z.string().min(1), label: z.string().min(1), year: z.union([z.number(), z.string()]).optional() });

export const timelineConfig = z.object({
  events: z.array(tlEvent).min(3),
  correctOrder: z.array(z.string().min(1)).min(3), // event ids in correct sequence
  question: z.string().optional(),
});

const base = { title: z.string().min(1), description: z.string().min(1), difficulty: z.enum(["easy", "medium", "hard"]) };

export const gameSchema = z.discriminatedUnion("engine", [
  z.object({ ...base, engine: z.literal("grid"), config: gridConfig }),
  z.object({ ...base, engine: z.literal("graph"), config: graphConfig }),
  z.object({ ...base, engine: z.literal("timeline"), config: timelineConfig }),
]);

export type Game = z.infer<typeof gameSchema>;
export type GridGameData = Extract<Game, { engine: "grid" }>;
export type GraphGameData = Extract<Game, { engine: "graph" }>;
export type TimelineGameData = Extract<Game, { engine: "timeline" }>;

/** Parse unknown JSON into a Game, or null if it doesn't match any engine. */
export function parseGame(raw: unknown): Game | null {
  const r = gameSchema.safeParse(raw);
  return r.success ? r.data : null;
}
