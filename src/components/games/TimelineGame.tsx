// src/components/games/TimelineGame.tsx — put the events in the correct order.
// ponytail: up/down reorder instead of drag-and-drop — native, touch-friendly, no dep.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TimelineGameData } from "@/lib/gameSchema";
import { CheckCircle2, ChevronDown, ChevronUp, RotateCcw, XCircle } from "lucide-react";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Avoid handing back the already-correct order.
  return a.every((x, i) => x === arr[i]) && a.length > 1 ? shuffle(arr) : a;
}

export function TimelineGame({ data, onWin }: { data: TimelineGameData; onWin: () => void }) {
  const { events, correctOrder, question } = data.config;
  const byId = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);

  const [order, setOrder] = useState<string[]>(() => shuffle(correctOrder));
  const [result, setResult] = useState<null | "correct" | "wrong">(null);

  const swap = (i: number, j: number) => {
    if (result || j < 0 || j >= order.length) return;
    setOrder((o) => { const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };

  const check = () => {
    const correct = order.every((id, i) => id === correctOrder[i]);
    setResult(correct ? "correct" : "wrong");
    if (correct) onWin();
  };

  const reset = () => { setOrder(shuffle(correctOrder)); setResult(null); };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-center font-medium">{question ?? "Arrange the events in the correct order (earliest at top)."}</p>

      <ol className="flex w-full max-w-md flex-col gap-2">
        {order.map((id, i) => {
          const rightSpot = result && correctOrder[i] === id;
          const wrongSpot = result === "wrong" && correctOrder[i] !== id;
          return (
            <li
              key={id}
              className={[
                "flex items-center gap-3 rounded-xl border-l-4 bg-card px-3 py-2 shadow-sm transition-colors",
                rightSpot ? "border-primary bg-primary/5" : wrongSpot ? "border-destructive bg-destructive/5" : "border-primary/30",
              ].join(" ")}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{byId[id]?.label}</div>
                {byId[id]?.year != null && <div className="text-xs text-muted-foreground">{String(byId[id].year)}</div>}
              </div>
              {!result && (
                <div className="flex flex-col">
                  <button onClick={() => swap(i, i - 1)} disabled={i === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => swap(i, i + 1)} disabled={i === order.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {result === "correct" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 font-semibold text-primary"><CheckCircle2 className="h-5 w-5" /> Perfect order!</div>
      )}
      {result === "wrong" && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 font-semibold text-destructive"><XCircle className="h-5 w-5" /> Some are out of place — keep trying.</div>
      )}

      {result ? (
        <Button variant="outline" size="sm" onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" /> Reshuffle</Button>
      ) : (
        <Button size="sm" onClick={check}>Check order</Button>
      )}
    </div>
  );
}
