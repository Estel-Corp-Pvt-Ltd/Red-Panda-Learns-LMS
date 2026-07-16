// src/components/games/GameRenderer.tsx — dispatch a validated Game to its engine.
import type { Game } from "@/lib/gameSchema";
import { GridGame } from "./GridGame";
import { GraphGame } from "./GraphGame";
import { TimelineGame } from "./TimelineGame";

export function GameRenderer({ game, onWin }: { game: Game; onWin: () => void }) {
  switch (game.engine) {
    case "grid":
      return <GridGame data={game} onWin={onWin} />;
    case "graph":
      return <GraphGame data={game} onWin={onWin} />;
    case "timeline":
      return <TimelineGame data={game} onWin={onWin} />;
    default:
      return null; // exhaustive — schema guarantees one of the above
  }
}
