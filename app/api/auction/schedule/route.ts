import { getAuctionSchedule, getBidsForCard } from "@/features/auction/queries";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function serializeCard(card: typeof schema.cards.$inferSelect) {
    return {
        id: card.id,
        playerName: card.playerName,
        team: card.team,
        rarity: card.rarity,
        imageUrl: card.imageUrl,
        startingPrice: card.startingPrice,
        currentPrice: card.currentPrice,
        scheduledStartTime: card.scheduledStartTime.toISOString(),
        auctionEndTime: card.auctionEndTime?.toISOString() ?? null,
        status: card.status,
        winningBid: card.winningBid,
        wonByAgentId: card.wonByAgentId,
    };
}

export async function GET() {
    try {
        const { live, upcoming, completed } = await getAuctionSchedule();

        let liveBids: Array<{ agentId: string; agentName: string; amount: number; createdAt: string }> = [];
        let liveBidCount = 0;

        if (live) {
            const bids = await getBidsForCard(live.id);
            liveBidCount = bids.length;

            // Get agent names for the bids
            const agentIds = [...new Set(bids.map((b) => b.agentId))];
            const agents = await Promise.all(
                agentIds.map((id) =>
                    db.query.agents.findFirst({ where: eq(schema.agents.id, id) }),
                ),
            );
            const agentMap = new Map(agents.filter(Boolean).map((a) => [a!.id, a!.name]));

            liveBids = bids.slice(0, 10).map((b) => ({
                agentId: b.agentId,
                agentName: agentMap.get(b.agentId) ?? "Unknown",
                amount: b.bidAmount,
                createdAt: b.createdAt.toISOString(),
            }));
        }

        // For completed auctions, get winner agent names
        const completedWithWinners = await Promise.all(
            completed.map(async (card) => {
                let winnerName: string | null = null;
                if (card.wonByAgentId) {
                    const agent = await db.query.agents.findFirst({
                        where: eq(schema.agents.id, card.wonByAgentId),
                    });
                    winnerName = agent?.name ?? null;
                }
                return { ...serializeCard(card), winnerAgentName: winnerName };
            }),
        );

        return NextResponse.json({
            live: live ? { ...serializeCard(live), bids: liveBids, bidCount: liveBidCount } : null,
            upcoming: upcoming.map(serializeCard),
            completed: completedWithWinners,
        });
    } catch (error) {
        console.error("Schedule error:", error);
        return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
    }
}
