import { db, schema } from "@/lib/db";
import { createTool } from "@mastra/core/tools";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const fetchAvailableCards = createTool({
    id: "fetch-available-cards",
    description: "Fetches all currently active auction cards that haven't expired yet",
    inputSchema: z.object({}),
    outputSchema: z.object({
        cards: z.array(z.object({
            id: z.string(),
            playerName: z.string(),
            team: z.string(),
            rarity: z.string(),
            startingPrice: z.number(),
            currentPrice: z.number(),
            auctionEndTime: z.string(),
        })),
    }),
    execute: async () => {
        const now = new Date();
        const cards = await db.query.cards.findMany({
            where: eq(schema.cards.status, "live"),
        });
        return {
            cards: cards.map((c) => ({
                id: c.id,
                playerName: c.playerName,
                team: c.team,
                rarity: c.rarity,
                startingPrice: c.startingPrice,
                currentPrice: c.currentPrice,
                auctionEndTime: c.auctionEndTime?.toISOString() ?? "",
            })),
        };
    },
});

export const scoreCards = createTool({
    id: "score-cards",
    description:
        "Scores and ranks cards based on agent preferences (teams, players, rarity). Returns cards sorted by relevance score.",
    inputSchema: z.object({
        cardIds: z.array(z.string()).describe("IDs of cards to score"),
        preferredTeams: z.array(z.string()).describe("Teams the user prefers"),
        preferredPlayers: z.array(z.string()).describe("Players the user prefers"),
        rarityPreference: z.string().describe("Preferred rarity: common, rare, epic, legendary"),
    }),
    outputSchema: z.object({
        scoredCards: z.array(z.object({
            cardId: z.string(),
            playerName: z.string(),
            team: z.string(),
            rarity: z.string(),
            score: z.number(),
            currentPrice: z.number(),
            reason: z.string(),
        })),
    }),
    execute: async ({ cardIds, preferredTeams, preferredPlayers, rarityPreference }) => {
        const cards = await db.query.cards.findMany({
            where: eq(schema.cards.status, "live"),
        });

        const filtered = cards.filter((c) => cardIds.includes(c.id));
        const rarityScores: Record<string, number> = {
            common: 1,
            rare: 2,
            epic: 3,
            legendary: 4,
        };

        const scored = filtered.map((card) => {
            let score = 0;
            const reasons: string[] = [];

            if (preferredTeams.map((t) => t.toLowerCase()).includes(card.team.toLowerCase())) {
                score += 30;
                reasons.push("preferred team");
            }
            if (preferredPlayers.map((p) => p.toLowerCase()).includes(card.playerName.toLowerCase())) {
                score += 40;
                reasons.push("preferred player");
            }
            const cardRarityScore = rarityScores[card.rarity] ?? 1;
            const prefRarityScore = rarityScores[rarityPreference] ?? 1;
            if (cardRarityScore >= prefRarityScore) {
                score += cardRarityScore * 10;
                reasons.push(`${card.rarity} rarity match`);
            }
            // Value score — lower price relative to rarity = better deal
            const valueRatio = card.startingPrice / (card.currentPrice || 1);
            score += Math.round(valueRatio * 10);

            return {
                cardId: card.id,
                playerName: card.playerName,
                team: card.team,
                rarity: card.rarity,
                score,
                currentPrice: card.currentPrice,
                reason: reasons.length ? reasons.join(", ") : "general interest",
            };
        });

        scored.sort((a, b) => b.score - a.score);
        return { scoredCards: scored };
    },
});

export const placeBid = createTool({
    id: "place-bid",
    description:
        "Places a bid on a card for a specific agent. Validates budget and ensures bid is higher than current price.",
    inputSchema: z.object({
        agentId: z.string().describe("The agent placing the bid"),
        cardId: z.string().describe("The card to bid on"),
        bidAmount: z.number().describe("The bid amount in dollars"),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        newPrice: z.number().optional(),
    }),
    execute: async ({ agentId, cardId, bidAmount }) => {
        const agent = await db.query.agents.findFirst({
            where: eq(schema.agents.id, agentId),
        });
        if (!agent) return { success: false, message: "Agent not found" };
        if (agent.status !== "active") return { success: false, message: "Agent is not active" };
        if (bidAmount > agent.budgetRemaining) {
            return { success: false, message: `Insufficient budget. Remaining: $${agent.budgetRemaining}` };
        }

        const card = await db.query.cards.findFirst({
            where: eq(schema.cards.id, cardId),
        });
        if (!card) return { success: false, message: "Card not found" };
        if (card.status !== "live") return { success: false, message: "Auction not live" };
        if (card.auctionEndTime && new Date() > card.auctionEndTime) return { success: false, message: "Auction expired" };
        if (bidAmount <= card.currentPrice) {
            return { success: false, message: `Bid must be higher than current price: $${card.currentPrice}` };
        }

        // Place the bid atomically
        await db.transaction(async (tx) => {
            await tx.insert(schema.bids).values({
                cardId,
                agentId,
                bidAmount,
            });
            await tx
                .update(schema.cards)
                .set({ currentPrice: bidAmount })
                .where(eq(schema.cards.id, cardId));
            await tx
                .update(schema.agents)
                .set({
                    budgetRemaining: agent.budgetRemaining - bidAmount,
                    currentTargetCardId: cardId,
                })
                .where(eq(schema.agents.id, agentId));
            await tx.insert(schema.agentActivity).values({
                agentId,
                eventType: "bid",
                message: `Placed bid of $${bidAmount} on ${card.playerName} (${card.team})`,
                metadata: { cardId, bidAmount, playerName: card.playerName },
            });
        });

        return { success: true, message: `Bid of $${bidAmount} placed successfully`, newPrice: bidAmount };
    },
});
