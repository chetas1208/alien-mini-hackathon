import { db, schema } from "@/lib/db";
import type { Agent, AgentActivity, Bid, Card } from "@/lib/db/schema";
import { and, asc, desc, eq, gt, lt, ne, or, sql } from "drizzle-orm";

// ── Cards ──

export async function getActiveCards(): Promise<Card[]> {
    return db.query.cards.findMany({
        where: or(
            eq(schema.cards.status, "live"),
            eq(schema.cards.status, "scheduled"),
            eq(schema.cards.status, "upcoming"),
        ),
        orderBy: asc(schema.cards.scheduledStartTime),
    });
}

export async function getLiveAuction(): Promise<Card | undefined> {
    return db.query.cards.findFirst({
        where: eq(schema.cards.status, "live"),
    });
}

export async function getScheduledAuctions(limit = 20): Promise<Card[]> {
    return db.query.cards.findMany({
        where: or(
            eq(schema.cards.status, "scheduled"),
            eq(schema.cards.status, "upcoming"),
        ),
        orderBy: asc(schema.cards.scheduledStartTime),
        limit,
    });
}

export async function getCompletedAuctions(limit = 10): Promise<Card[]> {
    return db.query.cards.findMany({
        where: eq(schema.cards.status, "completed"),
        orderBy: desc(schema.cards.scheduledStartTime),
        limit,
    });
}

export async function getAuctionSchedule(): Promise<{
    live: Card | null;
    upcoming: Card[];
    completed: Card[];
}> {
    const [live, upcoming, completed] = await Promise.all([
        getLiveAuction(),
        getScheduledAuctions(15),
        getCompletedAuctions(10),
    ]);
    return { live: live ?? null, upcoming, completed };
}

export async function getCardById(id: string): Promise<Card | undefined> {
    return db.query.cards.findFirst({ where: eq(schema.cards.id, id) });
}

export async function getOwnedCards(alienId: string): Promise<Card[]> {
    return db.query.cards.findMany({
        where: eq(schema.cards.wonByAlienId, alienId),
        orderBy: desc(schema.cards.createdAt),
    });
}

export async function startAuction(cardId: string): Promise<Card> {
    const now = new Date();
    const endTime = new Date(now.getTime() + 30_000); // 30 seconds
    const [card] = await db
        .update(schema.cards)
        .set({ status: "live", auctionEndTime: endTime })
        .where(eq(schema.cards.id, cardId))
        .returning();
    return card;
}

export async function settleAuction(cardId: string): Promise<Card | null> {
    // Find the highest bid
    const highestBid = await db.query.bids.findFirst({
        where: eq(schema.bids.cardId, cardId),
        orderBy: desc(schema.bids.bidAmount),
    });

    if (highestBid) {
        const agent = await db.query.agents.findFirst({
            where: eq(schema.agents.id, highestBid.agentId),
        });

        // Only settle if still live — prevents duplicate settlements from concurrent ticks
        const rows = await db
            .update(schema.cards)
            .set({
                status: "completed",
                winningBid: highestBid.bidAmount,
                wonByAgentId: highestBid.agentId,
                wonByAlienId: agent?.alienId ?? null,
            })
            .where(and(eq(schema.cards.id, cardId), eq(schema.cards.status, "live")))
            .returning();
        return rows[0] ?? null;
    }

    // No bids — mark as completed with no winner (only if still live)
    const rows = await db
        .update(schema.cards)
        .set({ status: "completed" })
        .where(and(eq(schema.cards.id, cardId), eq(schema.cards.status, "live")))
        .returning();
    return rows[0] ?? null;
}

// ── Agents ──

export async function createAgent(data: {
    userId: string;
    alienId: string;
    name: string;
    budgetTotal: number;
    strategyType: string;
    preferencesJson: Record<string, unknown>;
    paymentInvoice: string;
    isBot?: boolean;
}): Promise<Agent> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const [agent] = await db
        .insert(schema.agents)
        .values({
            ...data,
            budgetRemaining: data.budgetTotal,
            status: data.isBot ? "active" : "pending_payment",
            isBot: data.isBot ? "true" : null,
            expiresAt,
        })
        .returning();
    return agent;
}

export async function activateAgentByInvoice(invoice: string): Promise<Agent | null> {
    const agent = await db.query.agents.findFirst({
        where: eq(schema.agents.paymentInvoice, invoice),
    });
    if (!agent) return null;
    if (agent.status !== "pending_payment") return agent;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [updated] = await db
        .update(schema.agents)
        .set({ status: "active", expiresAt })
        .where(eq(schema.agents.id, agent.id))
        .returning();
    return updated;
}

export async function getAgentsByAlienId(alienId: string): Promise<Agent[]> {
    return db.query.agents.findMany({
        where: eq(schema.agents.alienId, alienId),
        orderBy: desc(schema.agents.createdAt),
    });
}

export async function getActiveAgents(): Promise<Agent[]> {
    return db.query.agents.findMany({
        where: and(
            eq(schema.agents.status, "active"),
            or(
                gt(schema.agents.expiresAt, new Date()),
                sql`${schema.agents.expiresAt} IS NULL`,
            ),
        ),
    });
}

export async function getActiveUserAgents(): Promise<Agent[]> {
    return db.query.agents.findMany({
        where: and(
            eq(schema.agents.status, "active"),
            or(
                sql`${schema.agents.isBot} IS NULL`,
                ne(schema.agents.isBot, "true"),
            ),
        ),
    });
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
    return db.query.agents.findFirst({ where: eq(schema.agents.id, id) });
}

export async function updateAgentStatus(id: string, status: string) {
    await db.update(schema.agents).set({ status }).where(eq(schema.agents.id, id));
}

export async function expireOldAgents(): Promise<number> {
    const now = new Date();
    const expired = await db
        .update(schema.agents)
        .set({ status: "expired" })
        .where(
            and(
                eq(schema.agents.status, "active"),
                lt(schema.agents.expiresAt, now),
            ),
        )
        .returning();
    return expired.length;
}

// ── Bids ──

export async function getBidsForCard(cardId: string): Promise<Bid[]> {
    return db.query.bids.findMany({
        where: eq(schema.bids.cardId, cardId),
        orderBy: desc(schema.bids.createdAt),
    });
}

export async function getHighestBidForCard(cardId: string): Promise<Bid | undefined> {
    return db.query.bids.findFirst({
        where: eq(schema.bids.cardId, cardId),
        orderBy: desc(schema.bids.bidAmount),
    });
}

export async function placeBidForAgent(data: {
    cardId: string;
    agentId: string;
    bidAmount: number;
}): Promise<{ success: boolean; message: string }> {
    const agent = await getAgentById(data.agentId);
    if (!agent) return { success: false, message: "Agent not found" };
    if (agent.status !== "active") return { success: false, message: "Agent not active" };
    if (data.bidAmount > agent.budgetRemaining) return { success: false, message: "Insufficient budget" };

    const card = await getCardById(data.cardId);
    if (!card) return { success: false, message: "Card not found" };
    if (card.status !== "live") return { success: false, message: "Auction not live" };
    if (data.bidAmount <= card.currentPrice) return { success: false, message: "Bid too low" };

    await db.transaction(async (tx) => {
        await tx.insert(schema.bids).values(data);
        await tx.update(schema.cards).set({ currentPrice: data.bidAmount }).where(eq(schema.cards.id, data.cardId));
        await tx.update(schema.agents).set({
            budgetRemaining: agent.budgetRemaining - data.bidAmount,
            currentTargetCardId: data.cardId,
        }).where(eq(schema.agents.id, data.agentId));
    });

    return { success: true, message: "Bid placed" };
}

// ── Activity ──

export async function getAgentActivityLog(agentId: string, limit = 20): Promise<AgentActivity[]> {
    return db.query.agentActivity.findMany({
        where: eq(schema.agentActivity.agentId, agentId),
        orderBy: desc(schema.agentActivity.createdAt),
        limit,
    });
}

export async function getRecentActivity(limit = 50): Promise<AgentActivity[]> {
    return db.query.agentActivity.findMany({
        orderBy: desc(schema.agentActivity.createdAt),
        limit,
    });
}

export async function logAgentActivity(data: {
    agentId: string;
    eventType: string;
    message: string;
    metadata?: Record<string, unknown>;
}) {
    await db.insert(schema.agentActivity).values(data);
}
