import { mastra } from "@/mastra";
import { getActiveAgents, getAgentById, logAgentActivity, updateAgentStatus } from "./queries";

const AGENT_NAMES = [
    "Shadow Bidder", "Neon Hawk", "Turbo Scout", "Phantom Sniper",
    "Blitz Runner", "Iron Collector", "Volt Striker", "Apex Hunter",
    "Storm Chaser", "Cyber Wolf", "Nova Trader", "Pulse Agent",
];

export function generateAgentName(): string {
    const name = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${name} #${num}`;
}

export async function runAgentCycle(agentId: string): Promise<{
    action: string;
    reasoning: string;
    targetCard?: { id: string; playerName: string; team: string } | null;
    bidAmount?: number | null;
}> {
    const agent = await getAgentById(agentId);
    if (!agent || agent.status !== "active") {
        return { action: "skip", reasoning: "Agent not active" };
    }

    if (agent.budgetRemaining <= 0) {
        await updateAgentStatus(agentId, "finished");
        await logAgentActivity({
            agentId,
            eventType: "finished",
            message: "Budget fully spent — no more bids possible",
        });
        return { action: "skip", reasoning: "No budget remaining" };
    }

    const preferences = agent.preferencesJson as {
        teams?: string[];
        players?: string[];
        rarityPreference?: string;
    };

    await logAgentActivity({
        agentId,
        eventType: "scan",
        message: "Scanning the marketplace for matching cards...",
    });

    const biddingAgent = mastra.getAgent("biddingAgent");

    const prompt = `You are agent "${agent.name}" (ID: ${agent.id}).
Your strategy: ${agent.strategyType}
Your remaining budget: ${agent.budgetRemaining} credits
Your total budget: ${agent.budgetTotal} credits

User preferences:
- Favorite teams: ${preferences.teams?.join(", ") || "none specified"}
- Favorite players: ${preferences.players?.join(", ") || "none specified"}
- Rarity preference: ${preferences.rarityPreference || "any"}

Execute your bidding cycle now:
1. Fetch available cards using the fetch-available-cards tool
2. Score them using the score-cards tool with the user's preferences
3. Based on your ${agent.strategyType} strategy, decide whether to bid
4. If bidding, use the place-bid tool with agent ID: ${agent.id}

IMPORTANT: Your reasoning must be clear and specific. Explain WHY you chose a particular card, what made it attractive, and how your strategy influenced the decision. If you skip, explain what you're waiting for.

Respond with a JSON object:
{
  "action": "bid" | "skip" | "wait",
  "targetCard": { "id": "...", "playerName": "...", "team": "..." } | null,
  "bidAmount": number | null,
  "reasoning": "A clear 1-2 sentence explanation of your decision that a user would find helpful"
}`;

    try {
        const result = await biddingAgent.generate(prompt);

        const text = typeof result.text === "string" ? result.text : "";
        let parsed: Record<string, unknown> = { action: "skip", reasoning: "Completed analysis" };

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        } catch {
            parsed = { action: "evaluate", reasoning: text.slice(0, 300) };
        }

        const reasoning = (parsed.reasoning as string) || "Completed analysis cycle";
        const action = (parsed.action as string) || "skip";

        // Log clear, user-facing reasoning
        if (action === "bid" && parsed.targetCard) {
            const target = parsed.targetCard as { playerName?: string; team?: string };
            await logAgentActivity({
                agentId,
                eventType: "bid",
                message: reasoning,
                metadata: { targetCard: parsed.targetCard, bidAmount: parsed.bidAmount },
            });
        } else if (action === "wait") {
            await logAgentActivity({
                agentId,
                eventType: "evaluate",
                message: reasoning,
            });
        } else {
            await logAgentActivity({
                agentId,
                eventType: "evaluate",
                message: reasoning,
            });
        }

        return {
            action,
            reasoning,
            targetCard: parsed.targetCard as { id: string; playerName: string; team: string } | null,
            bidAmount: parsed.bidAmount as number | null,
        };
    } catch (error) {
        console.error(`Agent ${agentId} cycle error:`, error);
        await logAgentActivity({
            agentId,
            eventType: "error",
            message: "Encountered an issue during analysis — will retry next cycle",
        });
        return { action: "skip", reasoning: "Error during cycle" };
    }
}

export async function runAllAgentCycles() {
    const agents = await getActiveAgents();
    const results: Array<{ agentId: string; result: Awaited<ReturnType<typeof runAgentCycle>> }> = [];

    for (const agent of agents) {
        if (agent.budgetRemaining <= 0) {
            await updateAgentStatus(agent.id, "finished");
            await logAgentActivity({
                agentId: agent.id,
                eventType: "finished",
                message: "Budget fully spent — agent finished",
            });
            continue;
        }

        const result = await runAgentCycle(agent.id);
        results.push({ agentId: agent.id, result });

        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
    }

    return results;
}
