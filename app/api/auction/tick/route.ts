import { tick } from "@/features/auction/ticker";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const result = await tick();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Tick error:", error);
        return NextResponse.json(
            { error: "Tick failed", details: String(error) },
            { status: 500 },
        );
    }
}
