import { ApiError } from "@/lib/errors";
import type { PaymentProvider } from "./index";

function secret() {
  return process.env.KHALTI_SECRET_KEY?.trim() ?? "";
}

function envOr(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

/** Khalti initiate is disabled — payments go through eSewa only for now. */
export const khaltiProvider: PaymentProvider = {
  async initiate() {
    throw new ApiError(
      "PROVIDER_DISABLED",
      "Khalti is disabled. Use eSewa (provider: \"ESEWA\").",
      400,
    );
  },

  async verify({ pidx }) {
    if (!pidx) return { ok: false };
    const lookupUrl = envOr(
      "KHALTI_LOOKUP_URL",
      "https://dev.khalti.com/api/v2/epayment/lookup/",
    );
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
