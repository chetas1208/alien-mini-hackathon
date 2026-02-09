"use client";

import { useAlien, usePayment } from "@alien_org/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { AgentDTO, CreateAgentRequest } from "../dto";

async function fetchAgents(authToken: string): Promise<AgentDTO[]> {
    const res = await fetch("/api/agents", {
        headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) throw new Error("Failed to fetch agents");
    const data = await res.json();
    return data.agents;
}

export function useAgents() {
    const { authToken } = useAlien();

    return useQuery({
        queryKey: ["agents"],
        queryFn: () => fetchAgents(authToken!),
        enabled: !!authToken,
        refetchInterval: 4000,
    });
}

export function useCreateAgentWithPayment({
    onPaid,
    onCancelled,
    onFailed,
}: {
    onPaid?: () => void;
    onCancelled?: () => void;
    onFailed?: () => void;
}) {
    const { authToken } = useAlien();
    const queryClient = useQueryClient();
    const agentNameRef = useRef<string>("");
    const agentIdRef = useRef<string>("");

    const payment = usePayment({
        onPaid: async () => {
            // Activate the agent immediately via client-side fallback
            // (the webhook may or may not fire depending on environment)
            if (agentIdRef.current && authToken) {
                try {
                    await fetch(`/api/agents/${agentIdRef.current}/activate`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${authToken}` },
                    });
                } catch (e) {
                    console.warn("Agent activation fallback failed:", e);
                }
            }
            queryClient.invalidateQueries({ queryKey: ["agents"] });
            queryClient.invalidateQueries({ queryKey: ["activity"] });
            onPaid?.();
        },
        onCancelled,
        onFailed,
    });

    const createAndPay = useCallback(
        async (data: CreateAgentRequest) => {
            if (!authToken) throw new Error("Not authenticated");

            const res = await fetch("/api/agents", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.error ?? "Failed to create agent");
            }

            const { agent, payment: paymentData } = await res.json();
            agentNameRef.current = agent.name;
            agentIdRef.current = agent.id;

            // Trigger the Alien payment UI
            payment.pay({
                recipient: paymentData.recipient,
                amount: paymentData.amount,
                token: paymentData.token,
                network: paymentData.network,
                invoice: paymentData.invoice,
                item: paymentData.item,
                ...(paymentData.test ? { test: paymentData.test } : {}),
            });

            return agent;
        },
        [authToken, payment],
    );

    return {
        createAndPay,
        agentName: agentNameRef.current,
        isLoading: payment.isLoading,
        isPaid: payment.isPaid,
        isCancelled: payment.isCancelled,
        isFailed: payment.isFailed,
        reset: payment.reset,
    };
}

export function useToggleAgent() {
    const { authToken } = useAlien();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (agentId: string) => {
            const res = await fetch(`/api/agents/${agentId}/pause`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!res.ok) throw new Error("Failed to toggle agent");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
}

export function useRunAgent() {
    const { authToken } = useAlien();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (agentId: string) => {
            const res = await fetch(`/api/agents/${agentId}/run`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (!res.ok) throw new Error("Failed to run agent");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents", "cards", "activity"] });
        },
    });
}
