import type { Agent, Card } from "@/lib/db/schema";
import {
    expireOldAgents,
    getActiveAgents,
    getLiveAuction,
    getScheduledAuctions,
    logAgentActivity,
    placeBidForAgent,
    settleAuction,
    startAuction,
} from "./queries";

const AUCTION_DURATION_MS = 30_000; // 30 seconds
const SETTLE_GAP_MS = 5_000; // 5 seconds between auctions

// Prevent concurrent tick execution (client fires every 3s, requests can overlap)
let tickInProgress = false;

// ── Strategy-based bid logic (used by both bots and real agents) ──

function calculateBid(
    agent: Agent,
    card: Card,
    preferences: { teams?: string[]; rarityPreference?: string },
): { shouldBid: boolean; amount: number; reasoning: string } {
    const teamMatch = preferences.teams?.some(
        (t) => t.toLowerCase() === card.team.toLowerCase(),
    );
    const rarityScores: Record<string, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };
    const cardRarity = rarityScores[card.rarity] ?? 1;
    const prefRarity = rarityScores[preferences.rarityPreference ?? "rare"] ?? 2;
    const rarityMatch = cardRarity >= prefRarity;

    // Base interest score
    let interest = 0;
    if (teamMatch) interest += 40;
    if (rarityMatch) interest += cardRarity * 10;
    if (!teamMatch && !rarityMatch) interest += 10; // slight general interest

    const currentPrice = card.currentPrice;
    const budget = agent.budgetRemaining;

    let multiplier = 1;
    let reasoning = "";

    switch (agent.strategyType) {
        case "aggressive":
            multiplier = 1.15 + Math.random() * 0.1; // 15-25% above
            reasoning = teamMatch
                ? `Going hard on ${card.playerName} — ${card.team} is a priority target`
                : `Aggressive play on ${card.playerName} (${card.rarity})`;
            break;
        case "balanced":
            multiplier = 1.05 + Math.random() * 0.05; // 5-10% above
            reasoning = `Fair value bid on ${card.playerName} — looks like a solid pick`;
            break;
        case "sniper":
            multiplier = 1.01 + Math.random() * 0.02; // 1-3% above
            reasoning = `Precise bid on ${card.playerName} — just enough to take the lead`;
            break;
        case "collector":
            if (cardRarity >= 3) {
                multiplier = 1.2 + Math.random() * 0.1; // 20-30% for epic/legendary
                reasoning = `Must-have ${card.rarity} card — ${card.playerName} is a collection piece`;
            } else {
                multiplier = 1.03 + Math.random() * 0.02;
                reasoning = `Low priority ${card.rarity} card — minimal bid on ${card.playerName}`;
            }
            break;
    }

    const amount = Math.round(currentPrice * multiplier);
    const shouldBid = interest >= 20 && amount <= budget && amount > currentPrice;

    if (!shouldBid) {
        reasoning = amount > budget
            ? `Can't afford ${card.playerName} at $${amount} — only $${budget} left`
            : `Passing on ${card.playerName} — doesn't match preferences`;
    }

    return { shouldBid, amount, reasoning };
}

// ── Ticker: the main orchestration loop ──

export async function tick(): Promise<{
    action: string;
    details: Record<string, unknown>;
}> {
    // Skip if another tick is already running (prevents duplicate logs from overlapping requests)
    if (tickInProgress) {
        return { action: "idle", details: { message: "Tick already in progress" } };
    }
    tickInProgress = true;
    try {
        return await _tick();
    } finally {
        tickInProgress = false;
    }
}

async function _tick(): Promise<{
    action: string;
    details: Record<string, unknown>;
}> {
    // 1. Expire old agents
    const expiredCount = await expireOldAgents();

    // 2. Check if there's a live auction that has ended
    const liveAuction = await getLiveAuction();

    if (liveAuction && liveAuction.auctionEndTime) {
        const now = new Date();
        if (now >= liveAuction.auctionEndTime) {
            // Settle this auction — returns null if already settled by another tick
            const settled = await settleAuction(liveAuction.id);

            if (!settled) {
                return { action: "idle", details: { message: "Already settled", expiredAgents: expiredCount } };
            }

            if (settled.wonByAgentId) {
                await logAgentActivity({
                    agentId: settled.wonByAgentId,
                    eventType: "won",
                    message: `Won ${settled.playerName} (${settled.team}) for $${settled.winningBid}!`,
                    metadata: { cardId: settled.id, winningBid: settled.winningBid },
                });
            }

            return {
                action: "settled",
                details: {
                    cardId: settled.id,
                    playerName: settled.playerName,
                    winner: settled.wonByAgentId,
                    winningBid: settled.winningBid,
                    expiredAgents: expiredCount,
                },
            };
        }

        // Auction still live — trigger agent bids
        const bids = await triggerAgentBids(liveAuction);
        return {
            action: "bidding",
            details: {
                cardId: liveAuction.id,
                playerName: liveAuction.playerName,
                bidsPlaced: bids.length,
                bids,
                expiredAgents: expiredCount,
            },
        };
    }

    // 3. No live auction — check if we should start the next one
    //    Only auto-start "scheduled" cards whose time has come.
    //    "upcoming" cards are admin-controlled — only go-live via admin API.
    const upcoming = await getScheduledAuctions(1);
    if (upcoming.length > 0) {
        const next = upcoming[0];
        const now = new Date();

        // Skip "upcoming" cards — admin must explicitly go-live
        if (next.status === "upcoming") {
            return {
                action: "waiting",
                details: {
                    nextAuction: next.playerName,
                    status: "upcoming",
                    message: "Waiting for admin to go live",
                    expiredAgents: expiredCount,
                },
            };
        }

        if (now >= next.scheduledStartTime) {
            const started = await startAuction(next.id);
            return {
                action: "started",
                details: {
                    cardId: started.id,
                    playerName: started.playerName,
                    team: started.team,
                    rarity: started.rarity,
                    endsAt: started.auctionEndTime?.toISOString(),
                    expiredAgents: expiredCount,
                },
            };
        }

        return {
            action: "waiting",
            details: {
                nextAuction: next.playerName,
                startsAt: next.scheduledStartTime.toISOString(),
                expiredAgents: expiredCount,
            },
        };
    }

    return {
        action: "idle",
        details: { message: "No auctions scheduled", expiredAgents: expiredCount },
    };
}

// ── Trigger all active agents to bid on a live auction ──

async function triggerAgentBids(card: Card): Promise<Array<{
    agentId: string;
    agentName: string;
    action: string;
    amount?: number;
    reasoning: string;
}>> {
    const agents = await getActiveAgents();
    const results: Array<{
        agentId: string;
        agentName: string;
        action: string;
        amount?: number;
        reasoning: string;
    }> = [];

    // Determine timing phase (for sniper strategy)
    const now = new Date();
    const endTime = card.auctionEndTime?.getTime() ?? now.getTime();
    const remaining = endTime - now.getTime();
    const isLatePhase = remaining < 10_000; // last 10 seconds
    const isEarlyPhase = remaining > 20_000; // first 10 seconds

    for (const agent of agents) {
        // Snipers only bid in the last 10 seconds
        if (agent.strategyType === "sniper" && !isLatePhase) continue;
        // Aggressive agents bid early
        if (agent.strategyType === "aggressive" && !isEarlyPhase && Math.random() > 0.3) continue;

        // Random chance to skip this tick (creates natural bidding waves)
        if (Math.random() > 0.6) continue;

        const preferences = agent.preferencesJson as {
            teams?: string[];
            rarityPreference?: string;
        };

        // Re-fetch card to get latest price
        const queries = await import("./queries");
        const freshCard = await queries.getCardById(card.id);
        if (!freshCard || freshCard.status !== "live") break;

        const { shouldBid, amount, reasoning } = calculateBid(agent, freshCard, preferences);

        if (shouldBid) {
            const result = await placeBidForAgent({
                cardId: card.id,
                agentId: agent.id,
                bidAmount: amount,
            });

            if (result.success) {
                await logAgentActivity({
                    agentId: agent.id,
                    eventType: "bid",
                    message: reasoning,
                    metadata: { cardId: card.id, bidAmount: amount, playerName: card.playerName },
                });
                results.push({ agentId: agent.id, agentName: agent.name, action: "bid", amount, reasoning });
            } else {
                results.push({ agentId: agent.id, agentName: agent.name, action: "skip", reasoning: result.message });
            }
        } else {
            await logAgentActivity({
                agentId: agent.id,
                eventType: "evaluate",
                message: reasoning,
                metadata: { cardId: card.id, playerName: card.playerName },
            });
            results.push({ agentId: agent.id, agentName: agent.name, action: "pass", reasoning });
        }
    }

    return results;
}
