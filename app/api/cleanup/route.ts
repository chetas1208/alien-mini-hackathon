import { db, schema } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        await db.delete(schema.agentActivity);
        await db.delete(schema.bids);
        await db.delete(schema.agents);
        await db.delete(schema.cards);

        return NextResponse.json({
            success: true,
            message: "Cleared all cards, agents, bids, and activity. Ready to re-seed.",
        });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json(
            { error: "Failed to clean up" },
            { status: 500 },
        );
    }
}
