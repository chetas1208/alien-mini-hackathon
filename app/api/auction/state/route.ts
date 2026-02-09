import { getActiveAgents, getActiveCards, getRecentActivity } from "@/features/auction/queries";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const [cards, agents, activity] = await Promise.all([
            getActiveCards(),
            getActiveAgents(),
            getRecentActivity(30),
        ]);

        return NextResponse.json({
            cards: cards.map((c) => ({
                id: c.id,
                playerName: c.playerName,
                team: c.team,
                rarity: c.rarity,
                startingPrice: c.startingPrice,
                currentPrice: c.currentPrice,
                scheduledStartTime: c.scheduledStartTime.toISOString(),
                auctionEndTime: c.auctionEndTime?.toISOString() ?? null,
                status: c.status,
            })),
            agents: agents.map((a) => ({
                id: a.id,
                name: a.name,
                status: a.status,
                strategyType: a.strategyType,
                budgetRemaining: a.budgetRemaining,
                budgetTotal: a.budgetTotal,
                currentTargetCardId: a.currentTargetCardId,
            })),
            activity: activity.map((a) => ({
                id: a.id,
                agentId: a.agentId,
                eventType: a.eventType,
                message: a.message,
                metadata: a.metadata,
                createdAt: a.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Error fetching auction state:", error);
        return NextResponse.json({ error: "Failed to fetch auction state" }, { status: 500 });
    }
}
