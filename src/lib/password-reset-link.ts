import { Role } from "@prisma/client";

export type PasswordResetLinks = {
  /**
   * Link placed in the email.
   * Prefer an https bridge URL so Gmail/Outlook can open it; the bridge then
   * hands off to the Expo / native deep link (no web password form).
   */
  primary: string;
  /** Native / Expo deep link that opens the reset screen in the app. */
  app: string;
};

function resolveWebBaseUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured && /^https?:\/\/[^/]+/i.test(configured)) {
    return configured.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/** Expo / custom-scheme deep link for the reset screen inside the mobile app. */
export function buildAppResetDeepLink(token: string, role: Role): string {
  const encoded = encodeURIComponent(token);
  const template = process.env.PASSWORD_RESET_URL_TEMPLATE?.trim();
  if (template) {
    if (!template.includes("{token}")) {
      throw new Error(
        "PASSWORD_RESET_URL_TEMPLATE must include {token}, e.g. exp://127.0.0.1:8081/--/reset-password?token={token}",
      );
    }
    return template.replaceAll("{token}", encoded);
  }

  const scheme =
    role === Role.PATIENT
      ? (process.env.PATIENT_APP_SCHEME?.trim() || "patienthospital")
      : role === Role.DOCTOR
        ? (process.env.DOCTOR_APP_SCHEME?.trim() || "doctorhospital")
        : null;

  if (!scheme) {
    throw new Error("No mobile app scheme for this role. Set PATIENT_APP_SCHEME / DOCTOR_APP_SCHEME.");
  }
  return `${scheme}://reset-password?token=${encoded}`;
}

/**
 * Email uses an https bridge page (so mail clients accept the link).
 * That page only opens the Expo deep link — it does not show a web reset form.
 *
 * Set for Expo Go:
 *   PASSWORD_RESET_URL_TEMPLATE="exp://YOUR_LAN_IP:8081/--/reset-password?token={token}"
 * And:
 *   APP_URL="https://hospital-appointment-system-lyart.vercel.app"
 */
export function buildPasswordResetLinks(token: string, role: Role): PasswordResetLinks {
  const encoded = encodeURIComponent(token);
  const app = buildAppResetDeepLink(token, role);
  const webBase = resolveWebBaseUrl();
  const roleParam =
    role === Role.DOCTOR ? "doctor" : role === Role.PATIENT ? "patient" : "patient";
  const bridge = `${webBase}/open-reset?token=${encoded}&role=${roleParam}`;

  try {
    const parsed = new URL(bridge);
    if (!parsed.hostname) throw new Error("empty hostname");
  } catch {
    throw new Error(
      `Invalid APP_URL for reset bridge "${bridge}". Set APP_URL=https://hospital-appointment-system-lyart.vercel.app`,
    );
  }

  // Email clients often block exp:// and custom schemes. Bridge is https → then deep link.
  return { primary: bridge, app };
}

/** @deprecated Prefer buildPasswordResetLinks */
export function buildPasswordResetUrl(token: string, role: Role = Role.PATIENT) {
  return buildPasswordResetLinks(token, role).primary;
}
