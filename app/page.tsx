"use client";

import { AgentCard } from "@/features/auction/components/agent-card";
import { AgentSetupModal, type AuctionCardContext } from "@/features/auction/components/agent-setup-modal";
import { LiveAuctionCard, NextUpCard } from "@/features/auction/components/live-auction";
import { useAgents } from "@/features/auction/hooks/use-agents";
import { useOwnedCards } from "@/features/auction/hooks/use-owned-cards";
import { useAuctionSchedule } from "@/features/auction/hooks/use-schedule";
import { useAuctionTicker } from "@/features/auction/hooks/use-ticker";
import { useAlien } from "@alien_org/react";
import { useState } from "react";

const RARITY_COLORS: Record<string, string> = {
    common: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    epic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function AgentsPage() {
    const { authToken } = useAlien();
    const { data: agents } = useAgents();
    const { data: schedule } = useAuctionSchedule();
    const { data: ownedCards } = useOwnedCards();
    const [setupCard, setSetupCard] = useState<AuctionCardContext | null>(null);
    const [showSetup, setShowSetup] = useState(false);

    useAuctionTicker(3000);

    const userAgents = agents?.filter((a) => !a.isBot) ?? [];
    const activeAgents = userAgents.filter((a) => a.status === "active");
    const hasAgents = userAgents.length > 0;
    const hasCollection = (ownedCards?.length ?? 0) > 0;

    const liveAuction = schedule?.live ?? null;
    const upcomingCard = !liveAuction
        ? schedule?.upcoming?.find((c) => c.status === "upcoming") ?? null
        : null;
    const lastCompleted = schedule?.completed?.[0] ?? null;

    const openSetup = (card?: AuctionCardContext) => {
        setSetupCard(card ?? null);
        setShowSetup(true);
    };
    const closeSetup = () => {
        setShowSetup(false);
        setSetupCard(null);
    };

    return (
        <>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    SuperBid
                </h1>
                <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                    Deploy AI agents to bid on Super Bowl player cards
                </p>
            </div>

            {!authToken && (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                        Open this app inside Alien to get started.
                    </p>
                </div>
            )}

            {authToken && !hasAgents && (
                <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
                    <span className="text-4xl">🤖</span>
                    <h2 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        Deploy Your Bidding Agent
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                        Set a strategy and budget. Your agent will automatically bid when auctions go live.
                    </p>
                    <button
                        onClick={() => openSetup()}
                        className="mt-4 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
                    >
                        Create Agent
                    </button>
                </div>
            )}

            {liveAuction && (
                <LiveAuctionCard
                    auction={liveAuction}
                    onDeploy={authToken && !hasAgents ? (card) => openSetup(card) : undefined}
                />
            )}

            {upcomingCard && (
                <NextUpCard
                    card={upcomingCard}
                    onDeploy={authToken && !hasAgents ? (card) => openSetup(card) : undefined}
                />
            )}

            {authToken && hasAgents && !liveAuction && !upcomingCard && (
                <div className="rounded-xl border border-zinc-200/60 bg-white p-5 text-center dark:border-zinc-800/60 dark:bg-zinc-900">
                    <span className="text-3xl">🏟️</span>
                    <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {activeAgents.length > 0
                            ? `${activeAgents.length} agent${activeAgents.length > 1 ? "s" : ""} ready — waiting for the next auction`
                            : "No active agents"}
                    </p>
                    {lastCompleted && lastCompleted.winningBid && (
                        <p className="mt-1 text-xs text-zinc-400">
                            Last: {lastCompleted.playerName} won for ${lastCompleted.winningBid.toFixed(0)} by {lastCompleted.winnerAgentName}
                        </p>
                    )}
                </div>
            )}

            {authToken && hasAgents && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                            Your Agents
                        </h2>
                        <button
                            onClick={() => openSetup()}
                            className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                            + New Agent
                        </button>
                    </div>
                    {userAgents.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </div>
            )}

            {authToken && hasCollection && (
                <div className="flex flex-col gap-2">
                    <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        🏆 Your Collection
                    </h2>
                    {ownedCards!.map((card) => (
                        <div
                            key={card.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-white p-3 dark:border-zinc-800/60 dark:bg-zinc-900"
                        >
                            <div>
                                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{card.playerName}</p>
                                <p className="text-[10px] text-zinc-400">{card.team}</p>
                                {card.wonByAgentName && (
                                    <p className="text-[10px] text-emerald-500 dark:text-emerald-400">Won by {card.wonByAgentName}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${RARITY_COLORS[card.rarity]}`}>
                                    {card.rarity}
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    ${(card.winningBid ?? card.currentPrice).toFixed(0)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AgentSetupModal
                open={showSetup}
                onClose={closeSetup}
                onCreated={closeSetup}
                card={setupCard ?? undefined}
            />
        </>
    );
}
