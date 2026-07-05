import { describe, it, expect } from "vitest";
import { validateGame } from "../src/lib/game";

const grid = (over: any = {}) => ({
  title: "Maze", description: "d", difficulty: "easy",
  config: { rows: 4, cols: 4, player: [0, 0], goal: [3, 3], walls: [], coins: [[1, 1]], lesson: "Q-learning", ...over },
});
const graph = (over: any = {}) => ({
  title: "G", description: "d", difficulty: "medium",
  config: { nodes: [{ id: "A", label: "Rain" }, { id: "B", label: "Wet" }], edges: [{ from: "A", to: "B" }], mode: "bayesian", question: "root?", answer: ["A"], ...over },
});
const timeline = (over: any = {}) => ({
  title: "T", description: "d", difficulty: "hard",
  config: { events: [{ id: "1", label: "Perceptron" }, { id: "2", label: "AlexNet" }, { id: "3", label: "Transformer" }], correctOrder: ["1", "2", "3"], ...over },
});

describe("validateGame", () => {
  it("accepts valid games", () => {
    expect(validateGame(grid(), "grid").ok).toBe(true);
    expect(validateGame(graph(), "graph").ok).toBe(true);
    expect(validateGame(timeline(), "timeline").ok).toBe(true);
  });

  it("rejects an unsolvable maze (goal walled off)", () => {
    const g = grid({ walls: [[2, 3], [3, 2]] }); // seals the 3,3 corner
    expect(validateGame(g, "grid").ok).toBe(false);
  });

  it("rejects out-of-bounds player/goal", () => {
    expect(validateGame(grid({ goal: [9, 9] }), "grid").ok).toBe(false);
  });

  it("rejects graph answer referencing an unknown node", () => {
    expect(validateGame(graph({ answer: ["Z"] }), "graph").ok).toBe(false);
  });

  it("rejects graph edge referencing an unknown node", () => {
    expect(validateGame(graph({ edges: [{ from: "A", to: "Z" }] }), "graph").ok).toBe(false);
  });

  it("rejects timeline whose correctOrder != event ids", () => {
    expect(validateGame(timeline({ correctOrder: ["1", "2", "9"] }), "timeline").ok).toBe(false);
    expect(validateGame(timeline({ correctOrder: ["1", "2"] }), "timeline").ok).toBe(false);
  });

  it("drops out-of-bounds walls/coins instead of failing", () => {
    const r = validateGame(grid({ coins: [[1, 1], [99, 99]] }), "grid");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.game.config.coins).toEqual([[1, 1]]);
  });
});
