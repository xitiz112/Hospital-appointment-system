import { Suspense } from "react";
import { OpenResetApp } from "@/components/open-reset-app";

/** Email landing page: redirects into Expo / native app. No web password form. */
export default function OpenResetPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F8FB] p-6">
      <Suspense>
        <OpenResetApp />
      </Suspense>
    </div>
  );
}
