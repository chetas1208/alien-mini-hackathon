"use client";

import { useEffect, useState } from "react";
import type { AgentDTO } from "../dto";
import { useToggleAgent } from "../hooks/use-agents";
import { AgentActivityInline } from "./agent-activity-inline";

const STRATEGY_ICONS: Record<string, string> = {
  aggressive: "🔥",
  balanced: "⚖️",
  sniper: "🎯",
  collector: "💎",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  pending_payment: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  expired: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
  finished: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Live",
  paused: "Paused",
  pending_payment: "Awaiting Payment",
  expired: "Expired",
  finished: "Finished",
};

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setText("Expired"); return; }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setText(`${hrs}h ${mins}m remaining`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <span className="text-[10px] text-zinc-400">{text}</span>;
}

export function AgentCard({ agent }: { agent: AgentDTO }) {
  const toggleAgent = useToggleAgent();
  const [expanded, setExpanded] = useState(true);

  const budgetPct = agent.budgetTotal > 0
    ? Math.round((agent.budgetRemaining / agent.budgetTotal) * 100)
    : 0;
  const isActive = agent.status === "active";
  const isPending = agent.status === "pending_payment";
  const isDone = agent.status === "expired" || agent.status === "finished";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{STRATEGY_ICONS[agent.strategyType] || "🤖"}</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {agent.name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-zinc-400 capitalize">{agent.strategyType}</p>
                {agent.expiresAt && isActive && (
                  <>
                    <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
                    <ExpiryCountdown expiresAt={agent.expiresAt} />
                  </>
                )}
              </div>
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[agent.status] || STATUS_STYLES.finished}`}>
            {STATUS_LABELS[agent.status] || agent.status}
          </span>
        </div>

        {/* Pending payment notice */}
        {isPending && (
          <div className="mt-3 rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Waiting for payment confirmation. Your agent will activate automatically once the transaction is confirmed.
            </p>
          </div>
        )}

        {/* Budget bar */}
        {!isPending && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Budget</span>
              <span>{agent.budgetRemaining.toFixed(0)} / {agent.budgetTotal.toFixed(0)} credits</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions — only pause/resume, no manual run */}
        {isActive && (
          <div className="mt-3">
            <button
              onClick={() => toggleAgent.mutate(agent.id)}
              disabled={toggleAgent.isPending}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors dark:border-zinc-700 dark:text-zinc-400"
            >
              {toggleAgent.isPending ? "..." : "Pause Agent"}
            </button>
          </div>
        )}

        {agent.status === "paused" && (
          <div className="mt-3">
            <button
              onClick={() => toggleAgent.mutate(agent.id)}
              disabled={toggleAgent.isPending}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {toggleAgent.isPending ? "..." : "Resume Agent"}
            </button>
          </div>
        )}
      </div>

      {/* Activity feed */}
      {!isPending && !isDone && (
        <div className="border-t border-zinc-100 dark:border-zinc-800/60">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between px-4 py-2"
          >
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Agent Activity
            </span>
            <span className="text-[10px] text-zinc-400">{expanded ? "▲" : "▼"}</span>
          </button>
          {expanded && (
            <div className="px-4 pb-3">
              <AgentActivityInline agentId={agent.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
