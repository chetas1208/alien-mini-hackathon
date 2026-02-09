"use client";

import type { ActivityDTO } from "@/features/auction/dto";
import { useAlien } from "@alien_org/react";
import { useQuery } from "@tanstack/react-query";

const EVENT_ICONS: Record<string, string> = {
  activated: "🚀",
  scan: "🔍",
  evaluate: "🧠",
  bid: "💰",
  strategy_change: "🔄",
  target_change: "🎯",
  paused: "⏸️",
  resumed: "▶️",
  finished: "🏁",
  error: "⚠️",
};

const EVENT_COLORS: Record<string, string> = {
  bid: "border-l-emerald-500",
  activated: "border-l-blue-500",
  error: "border-l-red-400",
  finished: "border-l-zinc-400",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

type StreamItem = ActivityDTO & { agentName?: string };

async function fetchStream(authToken: string): Promise<StreamItem[]> {
  const res = await fetch("/api/stream", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.stream;
}

export default function StreamPage() {
  const { authToken } = useAlien();

  const { data: stream, isLoading } = useQuery({
    queryKey: ["stream"],
    queryFn: () => fetchStream(authToken!),
    enabled: !!authToken,
    refetchInterval: 3000,
  });

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Agent Stream
        </h1>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
          Live feed of what your agents are doing
        </p>
      </div>

      {!authToken && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Open this app inside Alien to see your agent stream.
          </p>
        </div>
      )}

      {authToken && isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {authToken && !isLoading && (!stream || stream.length === 0) && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="text-4xl">📡</span>
          <p className="text-sm text-zinc-400">
            No activity yet. Deploy an agent and run a cycle.
          </p>
        </div>
      )}

      {authToken && stream && stream.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {stream.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border-l-2 bg-white px-3 py-2.5 dark:bg-zinc-900 ${EVENT_COLORS[item.eventType] || "border-l-zinc-200 dark:border-l-zinc-700"}`}
            >
              <span className="mt-0.5 text-sm">{EVENT_ICONS[item.eventType] || "📋"}</span>
              <div className="min-w-0 flex-1">
                {item.agentName && (
                  <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.agentName}
                  </p>
                )}
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {item.message}
                </p>
                <p className="mt-0.5 text-[9px] text-zinc-400">{timeAgo(item.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
