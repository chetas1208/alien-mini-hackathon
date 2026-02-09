"use client";

import { useCards } from "../hooks/use-cards";

const RARITY_COLORS: Record<string, string> = {
  common: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  epic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function timeRemaining(iso: string | null) {
  if (!iso) return "Scheduled";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export function CardGrid() {
  const { data: cards, isLoading } = useCards();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (!cards?.length) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">
        No active auctions. Seed cards to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div
          key={card.id}
          className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white p-3 dark:border-zinc-800/60 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${RARITY_COLORS[card.rarity]}`}
            >
              {card.rarity}
            </span>
            <span className="text-[10px] text-zinc-400">{timeRemaining(card.auctionEndTime ?? null)}</span>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {card.playerName}
          </p>
          <p className="text-[10px] text-zinc-400">{card.team}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              ${card.currentPrice.toFixed(0)}
            </span>
            {card.currentPrice > card.startingPrice && (
              <span className="text-[10px] text-emerald-500">
                +{((card.currentPrice / card.startingPrice - 1) * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
