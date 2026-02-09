"use client";

import { useQuery } from "@tanstack/react-query";
import type { CardDTO } from "../dto";

async function fetchCards(): Promise<CardDTO[]> {
    const res = await fetch("/api/cards");
    if (!res.ok) throw new Error("Failed to fetch cards");
    const data = await res.json();
    return data.cards;
}

export function useCards() {
    return useQuery({
        queryKey: ["cards"],
        queryFn: fetchCards,
        refetchInterval: 5000, // poll every 5s for live updates
    });
}
