import { formatInTimeZone } from "date-fns-tz";
import { HOSPITAL_TZ } from "@/lib/serialize";

export function formatKtm(date: Date | string, pattern = "yyyy-MM-dd HH:mm") {
  return formatInTimeZone(new Date(date), HOSPITAL_TZ, pattern);
}

export function statusVariant(status: string) {
  if (["CONFIRMED", "SUCCESS", "ACTIVE", "COMPLETED"].includes(status)) return "success" as const;
  if (["PENDING", "INITIATED"].includes(status)) return "warning" as const;
  if (["CANCELLED", "FAILED", "INACTIVE", "NO_SHOW"].includes(status)) return "danger" as const;
  return "secondary" as const;
}
