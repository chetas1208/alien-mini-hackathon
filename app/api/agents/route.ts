import { generateAgentName } from "@/features/auction/agent-runner";
import { getTierById } from "@/features/auction/constants";
import { CreateAgentRequest } from "@/features/auction/dto";
import { createAgent, getAgentsByAlienId } from "@/features/auction/queries";
import { extractBearerToken, verifyToken } from "@/features/auth/lib";
import { createPaymentIntent } from "@/features/payments/queries";
import { findOrCreateUser } from "@/features/user/queries";
import { JwtErrors } from "@alien_org/auth-client";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const token = extractBearerToken(request.headers.get("Authorization"));
        if (!token) {
            return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
        }

        const { sub } = await verifyToken(token);
        const agents = await getAgentsByAlienId(sub);

        return NextResponse.json({
            agents: agents.map((a) => ({
                id: a.id,
                name: a.name,
                status: a.status,
                budgetTotal: a.budgetTotal,
                budgetRemaining: a.budgetRemaining,
                strategyType: a.strategyType,
                preferences: a.preferencesJson,
                currentTargetCardId: a.currentTargetCardId,
                paymentInvoice: a.paymentInvoice,
                isBot: a.isBot === "true",
                expiresAt: a.expiresAt?.toISOString() ?? null,
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
        console.error("Error fetching agents:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = extractBearerToken(request.headers.get("Authorization"));
        if (!token) {
            return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
        }

        const { sub } = await verifyToken(token);
        const user = await findOrCreateUser(sub);

        const body = await request.json();
        const parsed = CreateAgentRequest.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { preferredTeams, preferredPlayers, rarityPreference, budgetTierId, strategyType } = parsed.data;

        const tier = getTierById(budgetTierId);
        if (!tier) {
            return NextResponse.json({ error: "Invalid budget tier" }, { status: 400 });
        }

        if (!tier.recipientAddress) {
            return NextResponse.json({ error: "Payment not available — recipient address not configured" }, { status: 400 });
        }

        // Create a payment intent for the agent funding
        const invoice = `inv-${randomUUID()}`;
        await createPaymentIntent({
            invoice,
            senderAlienId: sub,
            recipientAddress: tier.recipientAddress,
            amount: tier.amount,
            token: tier.token,
            network: tier.network,
            productId: tier.id,
        });

        // Create agent in pending_payment status
        const agent = await createAgent({
            userId: user.id,
            alienId: sub,
            name: generateAgentName(),
            budgetTotal: tier.credits,
            strategyType,
            preferencesJson: {
                teams: preferredTeams,
                players: preferredPlayers,
                rarityPreference,
            },
            paymentInvoice: invoice,
        });

        // Return both agent data and payment info for the Alien payment UI
        return NextResponse.json({
            agent: {
                id: agent.id,
                name: agent.name,
                status: agent.status,
                budgetTotal: agent.budgetTotal,
                budgetRemaining: agent.budgetRemaining,
                strategyType: agent.strategyType,
                preferences: agent.preferencesJson,
                currentTargetCardId: agent.currentTargetCardId,
                paymentInvoice: agent.paymentInvoice,
                isBot: false,
                expiresAt: agent.expiresAt?.toISOString() ?? null,
                createdAt: agent.createdAt.toISOString(),
            },
            payment: {
                invoice,
                recipient: tier.recipientAddress,
                amount: tier.amount,
                token: tier.token,
                network: tier.network,
                item: {
                    title: `SuperBid Agent — ${tier.name}`,
                    iconUrl: tier.iconUrl,
                    quantity: tier.credits,
                },
                test: "paid" as const,
            },
        });
    } catch (error) {
        if (error instanceof JwtErrors.JWTExpired) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }
        if (error instanceof JwtErrors.JOSEError) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
        console.error("Error creating agent:", error);
        return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
    }
}
