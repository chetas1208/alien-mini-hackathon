import { getAgentActivityLog, getAgentsByAlienId } from "@/features/auction/queries";
import { extractBearerToken, verifyToken } from "@/features/auth/lib";
import { JwtErrors } from "@alien_org/auth-client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const token = extractBearerToken(request.headers.get("Authorization"));
        if (!token) {
            return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
        }

        const { sub } = await verifyToken(token);
        const agents = await getAgentsByAlienId(sub);

        const agentMap = new Map(agents.map((a) => [a.id, a.name]));

        const allActivity = await Promise.all(
            agents.map((a) => getAgentActivityLog(a.id, 25)),
        );

        const stream = allActivity
            .flat()
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 50)
            .map((a) => ({
                id: a.id,
                agentId: a.agentId,
                agentName: agentMap.get(a.agentId) || "Unknown Agent",
                eventType: a.eventType,
                message: a.message,
                metadata: a.metadata,
                createdAt: a.createdAt.toISOString(),
            }));

        return NextResponse.json({ stream });
    } catch (error) {
        if (error instanceof JwtErrors.JWTExpired) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }
        if (error instanceof JwtErrors.JOSEError) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        console.error("Error fetching stream:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
