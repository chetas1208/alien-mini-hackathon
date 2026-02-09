import { getOwnedCards } from "@/features/auction/queries";
import { extractBearerToken, verifyToken } from "@/features/auth/lib";
import { db, schema } from "@/lib/db";
import { JwtErrors } from "@alien_org/auth-client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const token = extractBearerToken(request.headers.get("Authorization"));
        if (!token) {
            return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
        }

        const { sub } = await verifyToken(token);
        const cards = await getOwnedCards(sub);

        // Resolve winning agent names
        const cardsWithAgents = await Promise.all(
            cards.map(async (c) => {
                let wonByAgentName: string | null = null;
                if (c.wonByAgentId) {
                    const agent = await db.query.agents.findFirst({
                        where: eq(schema.agents.id, c.wonByAgentId),
                    });
                    wonByAgentName = agent?.name ?? null;
                }
                return {
                    id: c.id,
                    playerName: c.playerName,
                    team: c.team,
                    rarity: c.rarity,
                    imageUrl: c.imageUrl,
                    startingPrice: c.startingPrice,
                    currentPrice: c.currentPrice,
                    winningBid: c.winningBid,
                    wonByAgentName,
                    auctionEndTime: c.auctionEndTime?.toISOString() ?? null,
                    status: c.status,
                };
            }),
        );

        return NextResponse.json({ cards: cardsWithAgents });
    } catch (error) {
        if (error instanceof JwtErrors.JWTExpired) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }
        if (error instanceof JwtErrors.JOSEError) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        console.error("Error fetching owned cards:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
