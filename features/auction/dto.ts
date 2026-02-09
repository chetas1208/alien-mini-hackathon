import { z } from "zod";

export const CreateAgentRequest = z.object({
    preferredTeams: z.array(z.string()).min(1, "Select at least one team"),
    preferredPlayers: z.array(z.string()).default([]),
    rarityPreference: z.enum(["common", "rare", "epic", "legendary"]).default("rare"),
    budgetTierId: z.string().min(1, "Select a budget tier"),
    strategyType: z.enum(["aggressive", "balanced", "sniper", "collector"]),
});

export type CreateAgentRequest = z.infer<typeof CreateAgentRequest>;

export const AgentDTO = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    budgetTotal: z.number(),
    budgetRemaining: z.number(),
    strategyType: z.string(),
    preferences: z.record(z.string(), z.unknown()),
    currentTargetCardId: z.string().nullable(),
    paymentInvoice: z.string().nullable(),
    isBot: z.boolean(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
});

export type AgentDTO = z.infer<typeof AgentDTO>;

export const CardDTO = z.object({
    id: z.string(),
    playerName: z.string(),
    team: z.string(),
    rarity: z.string(),
    imageUrl: z.string().nullable(),
    startingPrice: z.number(),
    currentPrice: z.number(),
    scheduledStartTime: z.string(),
    auctionEndTime: z.string().nullable(),
    status: z.string(), // scheduled, live, settling, completed, expired
    winningBid: z.number().nullable(),
    wonByAgentId: z.string().nullable(),
});

export type CardDTO = z.infer<typeof CardDTO>;

export const ActivityDTO = z.object({
    id: z.string(),
    agentId: z.string(),
    eventType: z.string(),
    message: z.string(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.string(),
});

export type ActivityDTO = z.infer<typeof ActivityDTO>;
