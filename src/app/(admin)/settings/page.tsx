import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/admin/settings-form";
import { ImageUploadCard } from "@/components/admin/image-upload-card";

export default async function SettingsPage() {
  const hospital = await prisma.hospital.findFirst();
  if (!hospital) {
    return <p>No hospital has been seeded yet.</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Hospital profile, logo, cancellation window, and payment policy</p>
      </div>
      <ImageUploadCard
        title="Hospital logo"
        description="Shown in the patient and doctor apps. JPEG, PNG, or WebP up to 2MB."
        currentUrl={hospital.logoUrl}
        uploadUrl="/api/v1/admin/settings/logo"
        fieldName="logo"
      />
      <SettingsForm
        name={hospital.name}
        email={hospital.email ?? ""}
        phone={hospital.phone ?? ""}
        address={hospital.address ?? ""}
        cancellationHours={hospital.cancellationHours}
        paymentRequired={hospital.paymentRequired}
        defaultAppointmentDurationMin={hospital.defaultAppointmentDurationMin}
        timezone={hospital.timezone}
      />
    </div>
  );
}
