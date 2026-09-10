import { createHmac } from "crypto";
import { PaymentProviderType } from "@prisma/client";
import type { PaymentProvider } from "./index";

function productCode() {
  return process.env.ESEWA_PRODUCT_CODE ?? "EPAYTEST";
}

function secret() {
  return process.env.ESEWA_SECRET_KEY ?? "";
}

export function signEsewa(totalAmount: string, transactionUuid: string) {
  const product_code = productCode();
  const signed_field_names = "total_amount,transaction_uuid,product_code";
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${product_code}`;
  const signature = createHmac("sha256", secret()).update(message).digest("base64");
  return { product_code, signed_field_names, signature };
}

export const esewaProvider: PaymentProvider = {
  async initiate({ amount, transactionUuid, purchaseOrderName }) {
    const total_amount = amount.toFixed(2);
    const signed = signEsewa(total_amount, transactionUuid);
    return {
      provider: PaymentProviderType.ESEWA,
      payload: {
        formUrl: process.env.ESEWA_FORM_URL ?? "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        method: "POST",
        fields: {
          amount: total_amount,
          tax_amount: "0",
          total_amount,
          transaction_uuid: transactionUuid,
          product_code: signed.product_code,
          product_service_charge: "0",
          product_delivery_charge: "0",
          success_url: process.env.ESEWA_SUCCESS_URL,
          failure_url: process.env.ESEWA_FAILURE_URL,
          signed_field_names: signed.signed_field_names,
          signature: signed.signature,
          product_name: purchaseOrderName,
        },
      },
    };
  },

  async verify({ transactionUuid, totalAmount }) {
    if (!transactionUuid) return { ok: false };
    const url = new URL(
      process.env.ESEWA_STATUS_URL ?? "https://rc.esewa.com.np/api/epay/transaction/status/",
    );
    url.searchParams.set("product_code", productCode());
    url.searchParams.set("total_amount", totalAmount ?? "0");
    url.searchParams.set("transaction_uuid", transactionUuid);
    const res = await fetch(url, { cache: "no-store" });
    const raw = await res.json().catch(() => null);
    const status = String(raw?.status ?? "").toUpperCase();
    return {
      ok: status === "COMPLETE",
      gatewayTxnId: raw?.ref_id ? String(raw.ref_id) : transactionUuid,
      raw,
    };
  },
};
