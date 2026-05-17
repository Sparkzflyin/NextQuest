import { LogGameForm } from "./log-game-form";

export default function LogPage() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-1 text-2xl font-semibold">Log a game</h1>
      <p className="mb-8 text-sm text-neutral-400">
        Tell us about a game you played. Your rating helps shape its leaderboard position; the
        traits help us recommend others like it.
      </p>
      <LogGameForm />
    </div>
  );
}
