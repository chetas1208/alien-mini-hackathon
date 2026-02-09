import { getAgentById, logAgentActivity, updateAgentStatus } from "@/features/auction/queries";
import { extractBearerToken, verifyToken } from "@/features/auth/lib";
import { JwtErrors } from "@alien_org/auth-client";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

        const newStatus = agent.status === "active" ? "paused" : "active";
        await updateAgentStatus(id, newStatus);

        await logAgentActivity({
            agentId: id,
            eventType: newStatus === "paused" ? "paused" : "resumed",
            message: `${agent.name} ${newStatus === "paused" ? "paused" : "resumed"} by user`,
        });

        return NextResponse.json({ status: newStatus });
    } catch (error) {
        if (error instanceof JwtErrors.JWTExpired) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }
        if (error instanceof JwtErrors.JOSEError) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        console.error("Error toggling agent:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
