"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { LiveAuction as LiveAuctionType, ScheduleCard } from "../hooks/use-schedule";
import type { AuctionCardContext } from "./agent-setup-modal";

const RARITY_COLORS: Record<string, string> = {
    common: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    epic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function toCardContext(c: LiveAuctionType | ScheduleCard): AuctionCardContext {
    return {
        playerName: c.playerName,
        team: c.team,
        rarity: c.rarity,
        imageUrl: c.imageUrl,
        startingPrice: c.startingPrice,
    };
}

function CountdownTimer({ endTime }: { endTime: string }) {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        const update = () => {
            const diff = new Date(endTime).getTime() - Date.now();
            setRemaining(Math.max(0, diff));
        };
        update();
        const id = setInterval(update, 100);
        return () => clearInterval(id);
    }, [endTime]);

    const secs = Math.ceil(remaining / 1000);
    const pct = Math.min(100, (remaining / 30_000) * 100);
    const isUrgent = secs <= 10;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className={`text-xs font-bold tabular-nums ${isUrgent ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {secs > 0 ? `${secs}s left` : "Settling..."}
                </span>
                <span className="text-[10px] text-zinc-400">30s auction</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                    className={`h-full rounded-full transition-all duration-100 ${isUrgent ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export function LiveAuctionCard({
    auction,
    onDeploy,
}: {
    auction: LiveAuctionType;
    onDeploy?: (card: AuctionCardContext) => void;
}) {
    return (
        <div className="overflow-hidden rounded-xl border-2 border-emerald-400/60 bg-white dark:border-emerald-500/40 dark:bg-zinc-900">
            <div className="bg-emerald-50 px-4 py-2 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                        Live Now
                    </span>
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-start gap-3">
                    {auction.imageUrl && (
                        <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                            <Image
                                src={auction.imageUrl}
                                alt={auction.playerName}
                                fill
                                className="object-cover"
                                sizes="64px"
                            />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                    {auction.playerName}
                                </p>
                                <p className="text-xs text-zinc-400">{auction.team}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${RARITY_COLORS[auction.rarity]}`}>
                                {auction.rarity}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400">Current Bid</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            ${auction.currentPrice.toFixed(0)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400">Bids</p>
                        <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                            {auction.bidCount}
                        </p>
                    </div>
                </div>

                {auction.auctionEndTime && (
                    <div className="mt-3">
                        <CountdownTimer endTime={auction.auctionEndTime} />
                    </div>
                )}

                {auction.bids.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1">
                        {auction.bids.slice(0, 4).map((bid, i) => (
                            <div
                                key={`${bid.agentId}-${bid.createdAt}`}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] ${
                                    i === 0
                                        ? "bg-emerald-50 dark:bg-emerald-950/20"
                                        : "bg-zinc-50 dark:bg-zinc-800/40"
                                }`}
                            >
                                <span className="font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-[60%]">
                                    {bid.agentName}
                                </span>
                                <span className={`font-bold ${i === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}>
                                    ${bid.amount.toFixed(0)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {onDeploy && (
                    <button
                        onClick={() => onDeploy(toCardContext(auction))}
                        className="mt-3 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
                    >
                        Deploy Agent for {auction.team}
                    </button>
                )}
            </div>
        </div>
    );
}

export function NextUpCard({
    card,
    onDeploy,
}: {
    card: ScheduleCard;
    onDeploy?: (card: AuctionCardContext) => void;
}) {
    const isAdminQueued = card.status === "upcoming";

    return (
        <button
            onClick={() => onDeploy?.(toCardContext(card))}
            className="w-full overflow-hidden rounded-xl border border-zinc-200/60 bg-white text-left transition-all hover:border-zinc-300 active:scale-[0.99] dark:border-zinc-800/60 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
            <div className="bg-zinc-50 px-4 py-1.5 dark:bg-zinc-800/50">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        ⏭ Next Up
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                        {isAdminQueued ? "Waiting to go live" : "Scheduled"}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                    {card.imageUrl && (
                        <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                            <Image
                                src={card.imageUrl}
                                alt={card.playerName}
                                fill
                                className="object-cover"
                                sizes="40px"
                            />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {card.playerName}
                        </p>
                        <p className="text-[10px] text-zinc-400">{card.team}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${RARITY_COLORS[card.rarity]}`}>
                        {card.rarity}
                    </span>
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        ${card.startingPrice}
                    </span>
                </div>
            </div>
            {onDeploy && (
                <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800/60">
                    <p className="text-center text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Tap to deploy an agent for {card.team} →
                    </p>
                </div>
            )}
        </button>
    );
}
