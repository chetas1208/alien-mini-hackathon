// Agent budget tiers — each maps to a real USDC payment on Solana.
// The "credits" are the in-app bidding budget the agent gets (mapped to card $ values).
// Amounts are in USDC smallest units (6 decimals), so 1 USDC = 1_000_000.
// Mapping: 0.01 USDC → $50 in-app budget, 0.03 USDC → $150, 0.08 USDC → $400

const SOLANA_RECIPIENT = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS ?? "";
const ICON_URL = "https://avatars.githubusercontent.com/u/40111175?s=40&v=4";

export type AgentBudgetTier = {
    id: string;
    name: string;
    description: string;
    credits: number; // in-app bidding budget ($)
    priceLabel: string;
    amount: string; // USDC smallest units
    token: string;
    network: string;
    recipientAddress: string;
    iconUrl: string;
};

export const AGENT_BUDGET_TIERS: AgentBudgetTier[] = [
    {
        id: "agent-budget-starter",
        name: "Starter",
        description: "Enough to win a couple of common cards.",
        credits: 50,
        priceLabel: "0.01 USDC",
        amount: "10000",
        token: "USDC",
        network: "solana",
        recipientAddress: SOLANA_RECIPIENT,
        iconUrl: ICON_URL,
    },
    {
        id: "agent-budget-pro",
        name: "Pro",
        description: "Compete for rare and epic cards.",
        credits: 150,
        priceLabel: "0.03 USDC",
        amount: "30000",
        token: "USDC",
        network: "solana",
        recipientAddress: SOLANA_RECIPIENT,
        iconUrl: ICON_URL,
    },
    {
        id: "agent-budget-whale",
        name: "Whale",
        description: "Go all-in on legendary cards.",
        credits: 400,
        priceLabel: "0.08 USDC",
        amount: "80000",
        token: "USDC",
        network: "solana",
        recipientAddress: SOLANA_RECIPIENT,
        iconUrl: ICON_URL,
    },
];

export function getTierById(id: string): AgentBudgetTier | undefined {
    return AGENT_BUDGET_TIERS.find((t) => t.id === id);
}

export function getTierByCredits(credits: number): AgentBudgetTier | undefined {
    return AGENT_BUDGET_TIERS.find((t) => t.credits === credits);
}
