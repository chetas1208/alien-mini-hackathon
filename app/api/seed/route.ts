import { seedCards } from "@/features/auction/seed-cards";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        let options = {};
        try {
            const body = await request.json();
            options = body ?? {};
        } catch {
            // No body is fine — use defaults
        }

        const result = await seedCards(options);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error seeding:", error);
        return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
    }
}
