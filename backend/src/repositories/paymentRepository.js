import supabase from "../config/database.js";
import { mapDbError } from "../utils/dbErrors.js";

async function rpc(name, args) {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw mapDbError(error);
    return data;
}

export const paymentRepository = {
    async findPendingByOrder(orderId) {
        const { data, error } = await supabase
            .from("payments")
            .select("id, gateway_reference, raw")
            .eq("order_id", orderId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async findByReference(reference) {
        const { data, error } = await supabase
            .from("payments")
            .select("id, order_id")
            .eq("gateway_reference", reference)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async orderExists(orderId) {
        const { data, error } = await supabase.from("orders").select("id").eq("id", orderId).maybeSingle();
        if (error) throw error;
        return Boolean(data);
    },

    attachSession: ({ orderId, provider, reference, amountCents, checkoutUrl }) =>
        rpc("attach_payment_session", {
            p_order_id: orderId,
            p_provider: provider,
            p_reference: reference,
            p_amount: amountCents,
            p_checkout_url: checkoutUrl
        }),

    markPaid: ({ orderId, paymentId, amountCents, currency, raw }) =>
        rpc("mark_order_paid", {
            p_order_id: orderId,
            p_payment_id: paymentId,
            p_amount_cents: amountCents,
            p_currency: currency,
            p_raw: raw
        }),

    // The unique event_id column makes the database itself reject a second copy of the same event.
    async recordWebhook({ eventId, eventType, payload }) {
        const { error } = await supabase
            .from("webhook_events")
            .insert({ event_id: eventId, event_type: eventType, payload });

        if (!error) return { duplicate: false, processed: false };
        if (error.code !== "23505") throw error;

        const { data, error: readError } = await supabase
            .from("webhook_events")
            .select("processed")
            .eq("event_id", eventId)
            .single();
        if (readError) throw readError;
        return { duplicate: true, processed: data.processed };
    },

    async markWebhookProcessed(eventId) {
        const { error } = await supabase.from("webhook_events").update({ processed: true }).eq("event_id", eventId);
        if (error) throw error;
    },

    // Open payment sessions whose order is still unpaid: candidates for the scheduled reconciliation.
    async listPendingForReconcile(limit = 10) {
        const cutoff = new Date(Date.now() - 30_000).toISOString();
        const { data, error } = await supabase
            .from("payments")
            .select("id, order_id, order:orders!inner(status)")
            .eq("status", "pending")
            .eq("order.status", "pending_payment")
            .lt("created_at", cutoff)
            .limit(limit);
        if (error) throw error;
        return data;
    },

    // Open payment sessions that belong to cancelled or expired orders.
    async listDeadPending(limit = 20) {
        const { data, error } = await supabase
            .from("payments")
            .select("id, order_id, gateway_reference, order:orders!inner(status)")
            .eq("status", "pending")
            .in("order.status", ["cancelled", "expired"])
            .limit(limit);
        if (error) throw error;
        return data;
    },

    async setStatus(id, status) {
        const { error } = await supabase.from("payments").update({ status }).eq("id", id);
        if (error) throw error;
    }
};