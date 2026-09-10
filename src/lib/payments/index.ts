import { Appointment, PaymentProviderType } from "@prisma/client";

export type PaymentInitiateResult = {
  provider: PaymentProviderType;
  payload: Record<string, unknown>;
};

export interface PaymentProvider {
  initiate(input: {
    appointment: Appointment;
    amount: number;
    transactionUuid: string;
    purchaseOrderName: string;
  }): Promise<PaymentInitiateResult>;
  verify(input: Record<string, string | undefined>): Promise<{
    ok: boolean;
    gatewayTxnId?: string;
    raw?: unknown;
  }>;
}

export { esewaProvider } from "./esewa";
export { khaltiProvider } from "./khalti";
