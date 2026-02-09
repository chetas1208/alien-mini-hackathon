import { getAgentById, logAgentActivity } from "@/features/auction/queries";
import { extractBearerToken, verifyToken } from "@/features/auth/lib";
import { db, schema } from "@/lib/db";
import { JwtErrors } from "@alien_org/auth-client";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/agents/[id]/activate
 * Client-side fallback to activate an agent after payment.
 * Called by the onPaid callback when the Alien bridge confirms payment,
 * in case the webhook hasn't fired yet.
 */
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const token = extractBearerToken(_request.headers.get("Authorization"));
        if (!token) {
            return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
        }

        const { sub } = await verifyToken(token);
        const { id } = await params;

        const agent = await getAgentById(id);
        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Only the owner can activate their agent
        if (agent.alienId !== sub) {
            return NextResponse.json({ error: "Not your agent" }, { status: 403 });
        }

        // Already active — no-op
        if (agent.status === "active") {
            return NextResponse.json({ agent: { id: agent.id, status: agent.status } });
        }

        // Only activate from pending_payment
        if (agent.status !== "pending_payment") {
            return NextResponse.json({ error: `Cannot activate agent in ${agent.status} state` }, { status: 400 });
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const [updated] = await db
            .update(schema.agents)
            .set({ status: "active", expiresAt })
            .where(eq(schema.agents.id, id))
            .returning();

        await logAgentActivity({
            agentId: updated.id,
            eventType: "activated",
            message: `${updated.name} is now live — activated via client confirmation`,
        });

        return NextResponse.json({ agent: { id: updated.id, status: updated.status } });
    } catch (error) {
        if (error instanceof JwtErrors.JWTExpired) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }
        if (error instanceof JwtErrors.JOSEError) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        console.error("Error activating agent:", error);
        return NextResponse.json({ error: "Failed to activate agent" }, { status: 500 });
    }
}
