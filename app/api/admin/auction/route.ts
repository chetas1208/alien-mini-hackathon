import cardData from "@/data/data.json";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST /api/admin/auction — start a new auction for a card
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, cardId } = body;

        if (action === "seed") {
            // Seed cards only (no bots, no schedule — admin controls when auctions start)
            const existing = await db.query.cards.findMany();
            if (existing.length > 0) {
                return NextResponse.json({ error: "Cards already exist. Cleanup first." }, { status: 400 });
            }

            function getRarity(strength: number) {
                if (strength >= 96) return { rarity: "legendary", startingPrice: 35 + Math.floor(Math.random() * 10) };
                if (strength >= 92) return { rarity: "epic", startingPrice: 18 + Math.floor(Math.random() * 8) };
                if (strength >= 89) return { rarity: "rare", startingPrice: 8 + Math.floor(Math.random() * 5) };
                return { rarity: "common", startingPrice: 3 + Math.floor(Math.random() * 4) };
            }

            // All cards start as "scheduled" with a far-future time (admin triggers them manually)
            const farFuture = new Date("2099-01-01T00:00:00Z");
            const cards = cardData.map((c) => {
                const num = parseInt(c.card_id.replace("SB-LX-", ""), 10);
                const { rarity, startingPrice } = getRarity(c.strength_value);
                return {
                    playerName: c.player_name,
                    team: c.team,
                    rarity,
                    startingPrice,
                    imageUrl: `/cards/${num}.png`,
                    currentPrice: startingPrice,
                    scheduledStartTime: farFuture,
                    status: "scheduled" as const,
                };
            });

            await db.insert(schema.cards).values(cards);
            return NextResponse.json({ success: true, cards: cards.length });
        }

        // queue: move a card to "upcoming" so users can see it (but auction hasn't started yet)
        if (action === "queue" && cardId) {
            const card = await db.query.cards.findFirst({
                where: eq(schema.cards.id, cardId),
            });
            if (!card) {
                return NextResponse.json({ error: "Card not found" }, { status: 404 });
            }
            if (card.status !== "scheduled") {
                return NextResponse.json({ error: `Card status is ${card.status}, not scheduled` }, { status: 400 });
            }

            // Check there's no other upcoming card already
            const existingUpcoming = await db.query.cards.findFirst({
                where: eq(schema.cards.status, "upcoming"),
            });
            if (existingUpcoming) {
                return NextResponse.json(
                    { error: `Already have an upcoming card: ${existingUpcoming.playerName}` },
                    { status: 400 },
                );
            }

            const [queued] = await db
                .update(schema.cards)
                .set({ status: "upcoming", scheduledStartTime: new Date() })
                .where(eq(schema.cards.id, cardId))
                .returning();

            return NextResponse.json({
                success: true,
                card: {
                    id: queued.id,
                    playerName: queued.playerName,
                    team: queued.team,
                    rarity: queued.rarity,
                    startingPrice: queued.startingPrice,
                    status: "upcoming",
                },
            });
        }

        // go-live: start the 30s auction for the currently upcoming card
        if (action === "go-live") {
            // Check no auction is currently live
            const live = await db.query.cards.findFirst({
                where: eq(schema.cards.status, "live"),
            });
            if (live) {
                return NextResponse.json(
                    { error: `Auction already live: ${live.playerName}` },
                    { status: 400 },
                );
            }

            // Find the upcoming card (or use cardId if provided)
            const upcoming = cardId
                ? await db.query.cards.findFirst({ where: eq(schema.cards.id, cardId) })
                : await db.query.cards.findFirst({ where: eq(schema.cards.status, "upcoming") });

            if (!upcoming) {
                return NextResponse.json({ error: "No upcoming card to go live" }, { status: 400 });
            }
            if (upcoming.status !== "upcoming") {
                return NextResponse.json({ error: `Card status is ${upcoming.status}, expected upcoming` }, { status: 400 });
            }

            const now = new Date();
            const endTime = new Date(now.getTime() + 30_000);
            const [started] = await db
                .update(schema.cards)
                .set({ status: "live", auctionEndTime: endTime, scheduledStartTime: now })
                .where(eq(schema.cards.id, upcoming.id))
                .returning();

            return NextResponse.json({
                success: true,
                auction: {
                    id: started.id,
                    playerName: started.playerName,
                    team: started.team,
                    rarity: started.rarity,
                    startingPrice: started.startingPrice,
                    endsAt: endTime.toISOString(),
                },
            });
        }

        if (action === "seed-bots") {
            const BOT_USER_ID = "00000000-0000-0000-0000-000000000000";
            const now = new Date();
            const allTeams = [...new Set(cardData.map((c) => c.team))];
            const bots = [
                { name: "🔥 Blitz Runner #99", strategyType: "aggressive", budgetTotal: 400, preferences: { teams: allTeams, rarityPreference: "epic" } },
                { name: "⚖️ Steady Eddie #42", strategyType: "balanced", budgetTotal: 250, preferences: { teams: allTeams, rarityPreference: "rare" } },
                { name: "🎯 Ghost Sniper #7", strategyType: "sniper", budgetTotal: 200, preferences: { teams: allTeams, rarityPreference: "epic" } },
                { name: "💎 Vault Keeper #1", strategyType: "collector", budgetTotal: 500, preferences: { teams: allTeams, rarityPreference: "legendary" } },
            ];

            for (const bot of bots) {
                await db.insert(schema.agents).values({
                    userId: BOT_USER_ID,
                    alienId: `bot-${bot.strategyType}`,
                    name: bot.name,
                    status: "active",
                    budgetTotal: bot.budgetTotal,
                    budgetRemaining: bot.budgetTotal,
                    strategyType: bot.strategyType,
                    preferencesJson: bot.preferences,
                    isBot: "true",
                    expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
                });
            }

            return NextResponse.json({ success: true, bots: bots.length });
        }

        return NextResponse.json({ error: "Invalid action. Use: seed, seed-bots, queue, go-live" }, { status: 400 });
    } catch (error) {
        console.error("Admin auction error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET /api/admin/auction — get all cards with their status for admin view
export async function GET() {
    try {
        const cards = await db.query.cards.findMany({
            orderBy: (c, { asc }) => [asc(c.createdAt)],
        });

        const agents = await db.query.agents.findMany();
        const agentMap = new Map(agents.map((a) => [a.id, a]));

        return NextResponse.json({
            cards: cards.map((c) => {
                const winner = c.wonByAgentId ? agentMap.get(c.wonByAgentId) : null;
                return {
                    id: c.id,
                    playerName: c.playerName,
                    team: c.team,
                    rarity: c.rarity,
                    startingPrice: c.startingPrice,
                    currentPrice: c.currentPrice,
                    status: c.status,
                    winningBid: c.winningBid,
                    wonByAgentId: c.wonByAgentId,
                    wonByAgentName: winner?.name ?? null,
                    wonByIsBot: winner?.isBot === "true",
                    wonByAlienId: c.wonByAlienId,
                    auctionEndTime: c.auctionEndTime?.toISOString() ?? null,
                };
            }),
            agents: agents.map((a) => ({
                id: a.id,
                name: a.name,
                status: a.status,
                isBot: a.isBot === "true",
                strategyType: a.strategyType,
                budgetTotal: a.budgetTotal,
                budgetRemaining: a.budgetRemaining,
            })),
        });
    } catch (error) {
        console.error("Admin GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
