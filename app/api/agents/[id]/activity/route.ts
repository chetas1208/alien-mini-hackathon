import { getAgentActivityLog, getAgentById } from "@/features/auction/queries";
import { extractBearerToken, verifyToken } from "@/features/auth/lib";
import { JwtErrors } from "@alien_org/auth-client";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const token = extractBearerToken(request.headers.get("Authorization"));
        if (!token) {
            return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
        }

        const { sub } = await verifyToken(token);
        const { id } = await params;
        const agent = await getAgentById(id);

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }
        if (agent.alienId !== sub) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const activity = await getAgentActivityLog(id, 15);

        return NextResponse.json({
            activity: activity.map((a) => ({
                id: a.id,
                agentId: a.agentId,
                eventType: a.eventType,
                message: a.message,
                metadata: a.metadata,
                createdAt: a.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        if (error instanceof JwtErrors.JWTExpired) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }
        if (error instanceof JwtErrors.JOSEError) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        console.error("Error fetching agent activity:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
