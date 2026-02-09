import cardData from "@/data/data.json";
import { db, schema } from "@/lib/db";

// Map strength_value to rarity tiers and starting prices
function getRarity(strength: number): { rarity: string; startingPrice: number } {
    if (strength >= 96) return { rarity: "legendary", startingPrice: 35 + Math.floor(Math.random() * 10) };
    if (strength >= 92) return { rarity: "epic", startingPrice: 18 + Math.floor(Math.random() * 8) };
    if (strength >= 89) return { rarity: "rare", startingPrice: 8 + Math.floor(Math.random() * 5) };
    return { rarity: "common", startingPrice: 3 + Math.floor(Math.random() * 4) };
}

const SUPER_BOWL_CARDS = cardData.map((card) => {
    const num = parseInt(card.card_id.replace("SB-LX-", ""), 10);
    const { rarity, startingPrice } = getRarity(card.strength_value);
    return {
        playerName: card.player_name,
        team: card.team,
        rarity,
        startingPrice,
        imageUrl: `/cards/${num}.png`,
        position: card.position,
        strengthAttribute: card.strength_attribute,
        strengthValue: card.strength_value,
    };
});

// Bot agents that create competitive bidding
const teams = [...new Set(cardData.map((c) => c.team))];
const BOT_AGENTS = [
    {
        name: "🔥 Blitz Runner #99",
        strategyType: "aggressive",
        budgetTotal: 400,
        preferences: { teams, rarityPreference: "epic" },
    },
    {
        name: "⚖️ Steady Eddie #42",
        strategyType: "balanced",
        budgetTotal: 250,
        preferences: { teams, rarityPreference: "rare" },
    },
    {
        name: "🎯 Ghost Sniper #7",
        strategyType: "sniper",
        budgetTotal: 200,
        preferences: { teams, rarityPreference: "epic" },
    },
    {
        name: "💎 Vault Keeper #1",
        strategyType: "collector",
        budgetTotal: 500,
        preferences: { teams, rarityPreference: "legendary" },
    },
];

const BOT_USER_ID = "00000000-0000-0000-0000-000000000000";
const BOT_ALIEN_PREFIX = "bot-";

export type SeedOptions = {
    intervalMinutes?: number;
    firstAuctionInMinutes?: number;
};

export async function seedCards(options: SeedOptions = {}) {
    const { intervalMinutes = 3, firstAuctionInMinutes = 1 } = options;

    const existingCards = await db.query.cards.findMany();
    const existingAgents = await db.query.agents.findMany();

    if (existingCards.length > 0 || existingAgents.length > 0) {
        return {
            seeded: false,
            cards: existingCards.length,
            agents: existingAgents.length,
            message: "Data already exists. Use /api/cleanup first to reset.",
        };
    }

    const now = new Date();
    const intervalMs = intervalMinutes * 60 * 1000;
    const firstStart = new Date(now.getTime() + firstAuctionInMinutes * 60 * 1000);

    const cards = SUPER_BOWL_CARDS.map((card, i) => ({
        playerName: card.playerName,
        team: card.team,
        rarity: card.rarity,
        startingPrice: card.startingPrice,
        imageUrl: card.imageUrl,
        currentPrice: card.startingPrice,
        scheduledStartTime: new Date(firstStart.getTime() + i * intervalMs),
        status: "scheduled" as const,
    }));

    await db.insert(schema.cards).values(cards);

    for (const bot of BOT_AGENTS) {
        await db.insert(schema.agents).values({
            userId: BOT_USER_ID,
            alienId: `${BOT_ALIEN_PREFIX}${bot.strategyType}`,
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

    return {
        seeded: true,
        cards: cards.length,
        agents: BOT_AGENTS.length,
        firstAuction: firstStart.toISOString(),
        lastAuction: new Date(firstStart.getTime() + (cards.length - 1) * intervalMs).toISOString(),
        message: `Seeded ${cards.length} auctions (every ${intervalMinutes}m) and ${BOT_AGENTS.length} bot agents`,
    };
}
