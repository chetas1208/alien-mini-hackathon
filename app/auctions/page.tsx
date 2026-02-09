"use client";

import { AgentSetupModal, type AuctionCardContext } from "@/features/auction/components/agent-setup-modal";
import { LiveAuctionCard } from "@/features/auction/components/live-auction";
import type { CompletedAuction, ScheduleCard } from "@/features/auction/hooks/use-schedule";
import { useAuctionSchedule } from "@/features/auction/hooks/use-schedule";
import { useAlien } from "@alien_org/react";
import Image from "next/image";
import { useEffect, useState } from "react";

const RARITY_COLORS: Record<string, string> = {
    common: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    epic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function ScheduleCountdown({ startTime }: { startTime: string }) {
    const [text, setText] = useState("");
    useEffect(() => {
        const update = () => {
            const diff = new Date(startTime).getTime() - Date.now();
            if (diff <= 0) { setText("Starting..."); return; }
            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            if (hrs > 0) setText(`${hrs}h ${mins}m`);
            else if (mins > 0) setText(`${mins}m ${secs}s`);
            else setText(`${secs}s`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [startTime]);
    return <span className="text-[10px] font-medium tabular-nums text-zinc-400">{text}</span>;
}

function UpcomingRow({ card, isNext, onDeploy }: { card: ScheduleCard; isNext: boolean; onDeploy?: (card: AuctionCardContext) => void }) {
    return (
        <button
            onClick={() => onDeploy?.({ playerName: card.playerName, team: card.team, rarity: card.rarity, imageUrl: card.imageUrl, startingPrice: card.startingPrice })}
            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.99] ${
                isNext
                    ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                    : "border-zinc-200/60 bg-white hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-zinc-900 dark:hover:border-zinc-700"
            }`}
        >
            <div className="flex items-center gap-3">
                {card.imageUrl && (
                    <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded-md">
                        <Image src={card.imageUrl} alt={card.playerName} fill className="object-cover" sizes="32px" />
                    </div>
                )}
                {!card.imageUrl && isNext && <span className="text-xs">⏭</span>}
                <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{card.playerName}</p>
                    <p className="text-[10px] text-zinc-400">{card.team}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${RARITY_COLORS[card.rarity]}`}>
                    {card.rarity}
                </span>
                <div className="text-right">
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">${card.startingPrice}</p>
                    <ScheduleCountdown startTime={card.scheduledStartTime} />
                </div>
            </div>
        </button>
    );
}

function CompletedRow({ card }: { card: CompletedAuction }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200/40 bg-white p-3 dark:border-zinc-800/40 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
                {card.imageUrl && (
                    <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded-md">
                        <Image src={card.imageUrl} alt={card.playerName} fill className="object-cover" sizes="32px" />
                    </div>
                )}
                <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{card.playerName}</p>
                    <p className="text-[10px] text-zinc-400">{card.team}</p>
                </div>
            </div>
            <div className="text-right">
                {card.winningBid ? (
                    <>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">${card.winningBid.toFixed(0)}</p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[120px]">{card.winnerAgentName ?? "Unknown"}</p>
                    </>
                ) : (
                    <p className="text-[10px] text-zinc-400">No bids</p>
                )}
            </div>
        </div>
    );
}

export default function SchedulePage() {
    const { authToken } = useAlien();
    const { data: schedule, isLoading } = useAuctionSchedule();
    const [setupCard, setSetupCard] = useState<AuctionCardContext | null>(null);

    const handleDeploy = (card: AuctionCardContext) => { setSetupCard(card); };

    return (
        <>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Auction Schedule</h1>
                <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Tap any upcoming auction to deploy an agent</p>
            </div>

            {!authToken && (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                    <p className="text-sm text-amber-700 dark:text-amber-400">Open this app inside Alien to view auctions.</p>
                </div>
            )}

            {isLoading && (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                    ))}
                </div>
            )}

            {schedule && (
                <>
                    {schedule.live && (
                        <LiveAuctionCard auction={schedule.live} onDeploy={authToken ? handleDeploy : undefined} />
                    )}

                    {schedule.upcoming.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">📅 Upcoming</h2>
                            {schedule.upcoming.map((card, i) => (
                                <UpcomingRow key={card.id} card={card} isNext={i === 0 && !schedule.live} onDeploy={authToken ? handleDeploy : undefined} />
                            ))}
                        </div>
                    )}

                    {schedule.completed.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">✅ Completed</h2>
                            {schedule.completed.map((card) => (
                                <CompletedRow key={card.id} card={card} />
                            ))}
                        </div>
                    )}

                    {!schedule.live && schedule.upcoming.length === 0 && schedule.completed.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <span className="text-4xl">🏟️</span>
                            <p className="text-sm text-zinc-400">No auctions scheduled yet.</p>
                        </div>
                    )}
                </>
            )}

            <AgentSetupModal
                open={setupCard !== null}
                onClose={() => setSetupCard(null)}
                onCreated={() => setSetupCard(null)}
                card={setupCard ?? undefined}
            />
        </>
    );
}
