// src/components/games/GraphGame.tsx — node/edge puzzle: select the answer node(s).
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GraphGameData } from "@/lib/gameSchema";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

const W = 340, H = 300, R = 26;

export function GraphGame({ data, onWin }: { data: GraphGameData; onWin: () => void }) {
  const { nodes, edges, question, answer, explanation, mode } = data.config;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<null | "correct" | "wrong">(null);

  // Deterministic circular layout.
  const pos = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    const cx = W / 2, cy = H / 2, rad = Math.min(W, H) / 2 - R - 8;
    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      m[n.id] = { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
    });
    return m;
  }, [nodes]);

  const answerSet = useMemo(() => new Set(answer), [answer]);

  const toggle = (id: string) => {
    if (result) return;
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const check = () => {
    const correct = selected.size === answerSet.size && [...selected].every((id) => answerSet.has(id));
    setResult(correct ? "correct" : "wrong");
    if (correct) onWin();
  };

  const reset = () => { setSelected(new Set()); setResult(null); };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm">
        <span className="rounded-full bg-primary/10 px-3 py-1 font-medium capitalize text-primary">{mode}</span>
      </div>
      <p className="text-center font-medium">{question}</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md rounded-2xl bg-muted/40 shadow-inner">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" className="fill-muted-foreground" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = pos[e.from], b = pos[e.to];
          if (!a || !b) return null;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-muted-foreground/60" strokeWidth={2} markerEnd="url(#arrow)" />
              {e.label && (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">{e.label}</text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos[n.id];
          const isSel = selected.has(n.id);
          const reveal = result && answerSet.has(n.id);
          const wrongPick = result === "wrong" && isSel && !answerSet.has(n.id);
          const fill = reveal ? "fill-primary" : wrongPick ? "fill-destructive" : isSel ? "fill-primary/70" : "fill-background";
          const stroke = reveal || wrongPick || isSel ? "stroke-primary" : "stroke-muted-foreground/40";
          const textCls = reveal || wrongPick || isSel ? "fill-primary-foreground" : "fill-foreground";
          return (
            <g key={n.id} onClick={() => toggle(n.id)} className={result ? "cursor-default" : "cursor-pointer"}>
              <circle cx={p.x} cy={p.y} r={R} className={`${fill} ${stroke} transition-colors`} strokeWidth={2} />
              <text x={p.x} y={p.y + 3} textAnchor="middle" className={`${textCls} text-[10px] font-medium`}>
                {n.label.length > 9 ? n.label.slice(0, 8) + "…" : n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {result === "correct" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 font-semibold text-primary">
          <CheckCircle2 className="h-5 w-5" /> Correct!
        </div>
      )}
      {result === "wrong" && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 font-semibold text-destructive">
          <XCircle className="h-5 w-5" /> Not quite — the right answer is highlighted.
        </div>
      )}
      {result && explanation && <p className="text-center text-xs text-muted-foreground">{explanation}</p>}

      {result ? (
        <Button variant="outline" size="sm" onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" /> Try again</Button>
      ) : (
        <Button size="sm" onClick={check} disabled={selected.size === 0}>Check answer</Button>
      )}
    </div>
  );
}
