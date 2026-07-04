// src/components/games/DailyGameCard.tsx — small dashboard tile that opens the
// full mini-game in a modal on click.
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { gameService } from "@/services/gameService";
import type { Game } from "@/lib/gameSchema";
import { GameRenderer } from "./GameRenderer";
import { Gamepad2, Loader2, Play } from "lucide-react";

// ponytail: hotlinked istock preview — swap for a self-hosted asset if it ever 403s.
const PANDA_IMG =
  "https://media.istockphoto.com/id/485370249/photo/3d-panda-gamer.jpg?s=612x612&w=0&k=20&c=2qxQXUvfearj3dnGHZUhF67yjJQssW9_TfSLbm1OyqY=";

export function DailyGameCard() {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    let alive = true;
    gameService.getDailyGame().then((g) => {
      if (!alive) return;
      setGame(g);
      setState(g ? "ready" : "empty");
    });
    return () => { alive = false; };
  }, []);

  const handleWin = useCallback(async () => {
    if (claimed) return;
    setClaimed(true); // guard: award attempt only once per mount
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    const karma = await gameService.completeGame(true, name || undefined);
    toast({
      title: "🎉 Nice work!",
      description: karma > 0 ? `You earned +${karma} karma.` : "You've already claimed today's karma — play on for fun!",
    });
  }, [claimed, user]);

  if (state === "empty") return null; // no pool yet — hide the tile entirely

  if (state === "loading") {
    return (
      <div className="flex h-full min-h-[9rem] items-center justify-center rounded-3xl bg-muted/40 shadow-inner">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Compact tile */}
      <button
        onClick={() => setOpen(true)}
        className="group relative flex h-full min-h-[9rem] w-full flex-col justify-between overflow-hidden rounded-3xl border-none bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-left shadow-lg transition-all hover:shadow-xl hover:brightness-105"
      >
        <img
          src={PANDA_IMG}
          alt="Panda gamer mascot"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-24 rounded-2xl object-cover opacity-95 shadow-md transition-transform duration-300 group-hover:scale-105"
        />
        <div className="relative z-10 flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Gamepad2 className="h-4 w-4" />
          </span>
          {game && <Badge variant="secondary" className="capitalize">{game.difficulty}</Badge>}
        </div>
        <div className="relative z-10 max-w-[65%]">
          <p className="text-xs font-medium text-primary">Daily AI Game</p>
          <h3 className="line-clamp-2 text-base font-bold leading-tight text-foreground">{game?.title}</h3>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary">
            <Play className="h-3 w-3 fill-current" /> Tap to play
          </span>
        </div>
      </button>

      {/* Enlarged game modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" /> {game?.title}
            </DialogTitle>
            {game && <DialogDescription>{game.description}</DialogDescription>}
          </DialogHeader>
          {game && open && <GameRenderer game={game} onWin={handleWin} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
