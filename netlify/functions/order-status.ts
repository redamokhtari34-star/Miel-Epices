import { Handler } from "@netlify/functions";
import { getSupabaseAdmin, corsHeaders, jsonResponse } from "./_shared/supabaseAdmin";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  const sessionId = event.queryStringParameters?.session_id;
  if (!sessionId) {
    return jsonResponse(400, { error: "session_id requis." });
  }

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from("me_orders")
    .select("id, customer_name, items, total, status, created_at")
    .eq("stripe_session_id", sessionId)
    .single();

  if (error || !order) {
    return jsonResponse(404, { error: "Commande introuvable." });
  }

  // Only reveal the order once the Stripe webhook has actually confirmed payment —
  // never trust the mere presence of a session_id in the URL as proof of payment.
  if (order.status === "awaiting_payment") {
    return jsonResponse(202, { status: "awaiting_payment" });
  }

  return jsonResponse(200, { order });
};
