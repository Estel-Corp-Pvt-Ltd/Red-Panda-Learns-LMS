// src/components/games/GridGame.tsx — maze: reach the goal, grab coins.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GridGameData } from "@/lib/gameSchema";
import { Flag, RotateCcw, Trophy } from "lucide-react";

const k = (r: number, c: number) => `${r},${c}`;

export function GridGame({ data, onWin }: { data: GridGameData; onWin: () => void }) {
  const { rows, cols, player, goal, walls, coins, lesson } = data.config;
  const wallSet = useMemo(() => new Set(walls.map(([r, c]) => k(r, c))), [walls]);
  const coinSet = useMemo(() => new Set(coins.map(([r, c]) => k(r, c))), [coins]);

  const [pos, setPos] = useState<[number, number]>([player[0], player[1]]);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const reset = useCallback(() => {
    setPos([player[0], player[1]]);
    setCollected(new Set());
    setMoves(0);
    setWon(false);
  }, [player]);

  const move = useCallback(
    (dr: number, dc: number) => {
      if (won) return;
      setPos(([r, c]) => {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || wallSet.has(k(nr, nc))) return [r, c];
        setMoves((m) => m + 1);
        if (coinSet.has(k(nr, nc))) setCollected((s) => new Set(s).add(k(nr, nc)));
        if (nr === goal[0] && nc === goal[1] && !won) {
          setWon(true);
          onWin();
        }
        return [nr, nc];
      });
    },
    [rows, cols, wallSet, coinSet, goal, won, onWin]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
      };
      const d = map[e.key];
      if (d) { e.preventDefault(); move(d[0], d[1]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  // Click an orthogonally-adjacent, non-wall cell to step onto it.
  const clickCell = (r: number, c: number) => {
    const dr = r - pos[0], dc = c - pos[1];
    if (Math.abs(dr) + Math.abs(dc) === 1) move(dr, dc);
  };

  const totalCoins = coins.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm">
        <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">{lesson}</span>
        <span className="text-muted-foreground">Moves: {moves}{totalCoins > 0 && ` · Coins: ${collected.size}/${totalCoins}`}</span>
      </div>

      <div
        className="grid w-full max-w-md gap-1 rounded-2xl bg-muted/40 p-2 shadow-inner"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const isPlayer = pos[0] === r && pos[1] === c;
            const isGoal = goal[0] === r && goal[1] === c;
            const isWall = wallSet.has(k(r, c));
            const isCoin = coinSet.has(k(r, c)) && !collected.has(k(r, c));
            return (
              <button
                key={k(r, c)}
                onClick={() => clickCell(r, c)}
                disabled={isWall || won}
                className={[
                  "relative aspect-square rounded-md transition-all duration-150",
                  isWall ? "bg-foreground/80 shadow-inner" : "bg-background shadow-sm hover:bg-primary/5",
                ].join(" ")}
              >
                {isGoal && !isPlayer && <Flag className="absolute inset-0 m-auto h-1/2 w-1/2 text-primary" />}
                {isCoin && !isPlayer && <span className="absolute inset-0 m-auto h-2/5 w-2/5 rounded-full bg-amber-400 shadow" />}
                {isPlayer && (
                  <span className="absolute inset-0 m-auto h-3/5 w-3/5 rounded-full bg-primary shadow-md ring-2 ring-primary/30 transition-transform" />
                )}
              </button>
            );
          })
        )}
      </div>

      {won ? (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 font-semibold text-primary">
          <Trophy className="h-5 w-5" /> Solved in {moves} moves!
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">Use arrow keys / WASD, or tap an adjacent tile.</p>
      )}

      <Button variant="outline" size="sm" onClick={reset} className="gap-2">
        <RotateCcw className="h-4 w-4" /> Reset
      </Button>
    </div>
  );
}
