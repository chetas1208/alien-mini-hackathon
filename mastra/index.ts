import { Mastra } from "@mastra/core/mastra";
import { biddingAgent } from "./agents/bidding-agent";

export const mastra = new Mastra({
    agents: {
        biddingAgent,
    },
});
