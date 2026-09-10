import { PaymentProviderType } from "@prisma/client";
import type { PaymentProvider } from "./index";

function secret() {
  return process.env.KHALTI_SECRET_KEY ?? "";
}

export const khaltiProvider: PaymentProvider = {
  async initiate({ amount, transactionUuid, purchaseOrderName }) {
    const initiateUrl =
      process.env.KHALTI_INITIATE_URL ?? "https://dev.khalti.com/api/v2/epayment/initiate/";
    const res = await fetch(initiateUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: process.env.KHALTI_RETURN_URL,
        website_url: process.env.APP_URL ?? "http://localhost:3000",
        amount: Math.round(amount * 100),
        purchase_order_id: transactionUuid,
        purchase_order_name: purchaseOrderName,
      }),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        provider: PaymentProviderType.KHALTI,
        payload: { error: raw, ok: false },
      };
    }
    return {
      provider: PaymentProviderType.KHALTI,
      payload: {
        pidx: raw.pidx,
        paymentUrl: raw.payment_url,
        expiresAt: raw.expires_at,
        expiresIn: raw.expires_in,
      },
    };
  },

  async verify({ pidx }) {
    if (!pidx) return { ok: false };
    const lookupUrl =
      process.env.KHALTI_LOOKUP_URL ?? "https://dev.khalti.com/api/v2/epayment/lookup/";
    const res = await fetch(lookupUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });
    const raw = await res.json().catch(() => null);
    const status = String(raw?.status ?? "").toUpperCase();
    return {
      ok: status === "COMPLETED",
      gatewayTxnId: raw?.transaction_id ? String(raw.transaction_id) : pidx,
      raw,
    };
  },
};
