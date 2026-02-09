"use client";

import { useAlien } from "@alien_org/react";
import { useQuery } from "@tanstack/react-query";

export type OwnedCard = {
    id: string;
    playerName: string;
    team: string;
    rarity: string;
    imageUrl: string | null;
    startingPrice: number;
    currentPrice: number;
    winningBid: number | null;
    wonByAgentName: string | null;
    auctionEndTime: string | null;
    status: string;
};

async function fetchOwnedCards(authToken: string): Promise<OwnedCard[]> {
    const res = await fetch("/api/cards/owned", {
        headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Failed to fetch owned cards");
    const data = await res.json();
    return data.cards;
}

export function useOwnedCards() {
    const { authToken } = useAlien();

    return useQuery({
        queryKey: ["owned-cards"],
        queryFn: () => fetchOwnedCards(authToken!),
        enabled: !!authToken,
        refetchInterval: 5000,
    });
}
