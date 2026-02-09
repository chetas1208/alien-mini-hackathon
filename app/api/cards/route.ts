import { getActiveCards } from "@/features/auction/queries";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const cards = await getActiveCards();
        return NextResponse.json({
            cards: cards.map((c) => ({
                id: c.id,
                playerName: c.playerName,
                team: c.team,
                rarity: c.rarity,
                imageUrl: c.imageUrl,
                startingPrice: c.startingPrice,
                currentPrice: c.currentPrice,
                scheduledStartTime: c.scheduledStartTime.toISOString(),
                auctionEndTime: c.auctionEndTime?.toISOString() ?? null,
                status: c.status,
                winningBid: c.winningBid,
                wonByAgentId: c.wonByAgentId,
            })),
        });
    } catch (error) {
        console.error("Error fetching cards:", error);
        return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
    }
}
