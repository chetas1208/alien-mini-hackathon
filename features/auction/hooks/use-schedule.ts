"use client";

import { useQuery } from "@tanstack/react-query";

export type LiveBid = {
    agentId: string;
    agentName: string;
    amount: number;
    createdAt: string;
};

export type ScheduleCard = {
    id: string;
    playerName: string;
    team: string;
    rarity: string;
    imageUrl: string | null;
    startingPrice: number;
    currentPrice: number;
    scheduledStartTime: string;
    auctionEndTime: string | null;
    status: string;
    winningBid: number | null;
    wonByAgentId: string | null;
};

export type LiveAuction = ScheduleCard & {
    bids: LiveBid[];
    bidCount: number;
};

export type CompletedAuction = ScheduleCard & {
    winnerAgentName: string | null;
};

export type AuctionSchedule = {
    live: LiveAuction | null;
    upcoming: ScheduleCard[];
    completed: CompletedAuction[];
};

async function fetchSchedule(): Promise<AuctionSchedule> {
    const res = await fetch("/api/auction/schedule");
    if (!res.ok) throw new Error("Failed to fetch schedule");
    return res.json();
}

export function useAuctionSchedule() {
    return useQuery({
        queryKey: ["auction-schedule"],
        queryFn: fetchSchedule,
        refetchInterval: 2000, // poll every 2s for live updates
    });
}
