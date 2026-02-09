"use client";

import { useAlien } from "@alien_org/react";
import { useQuery } from "@tanstack/react-query";
import type { ActivityDTO } from "../dto";

const EVENT_ICONS: Record<string, string> = {
  activated: "🚀",
  scan: "🔍",
  evaluate: "🧠",
  bid: "💰",
  won: "🏆",
  strategy_change: "🔄",
  target_change: "🎯",
  paused: "⏸️",
  resumed: "▶️",
  finished: "🏁",
  error: "⚠️",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

async function fetchAgentActivity(authToken: string, agentId: string): Promise<ActivityDTO[]> {
  const res = await fetch(`/api/agents/${agentId}/activity`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.activity;
}

export function AgentActivityInline({ agentId }: { agentId: string }) {
  const { authToken } = useAlien();

  const { data: activity, isLoading } = useQuery({
    queryKey: ["agent-activity", agentId],
    queryFn: () => fetchAgentActivity(authToken!, agentId),
    enabled: !!authToken,
    refetchInterval: 3000,
  });

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1, 2].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-zinc-50 dark:bg-zinc-800/50" />
        ))}
      </div>
    );
  }

  if (!activity?.length) {
    return (
      <p className="py-3 text-center text-[11px] text-zinc-400">
        No activity yet — your agent will start bidding when an auction goes live.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {activity.slice(0, 10).map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/40"
        >
          <span className="mt-px text-xs">{EVENT_ICONS[item.eventType] || "📋"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              {item.message}
            </p>
            <p className="mt-0.5 text-[9px] text-zinc-400">{timeAgo(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
