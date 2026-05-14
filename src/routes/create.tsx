import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { createGame } from "@/lib/game";

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [{ title: "Quibbol Buzz | Create Game" }] }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      try {
        const game = await createGame();
        navigate({ to: "/manage/$code", params: { code: game.code } });
      } catch (e) {
        console.error(e);
        alert("Failed to create game");
        navigate({ to: "/" });
      }
    })();
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-muted-foreground">Creating game…</div>
    </main>
  );
}
