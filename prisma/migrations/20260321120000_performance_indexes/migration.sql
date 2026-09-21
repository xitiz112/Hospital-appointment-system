-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

-- CreateIndex
CREATE INDEX "Doctor_experienceYears_idx" ON "Doctor"("experienceYears");

-- CreateIndex
CREATE INDEX "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_reminderSentAt_startAt_idx" ON "Appointment"("reminderSentAt", "startAt");

-- CreateIndex
CREATE INDEX "Payment_gatewayRef_idx" ON "Payment"("gatewayRef");

-- CreateIndex
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

-- Reminder cron: only scan appointments that still need a reminder
CREATE INDEX IF NOT EXISTS appointment_reminder_pending_idx
ON "Appointment" ("startAt")
WHERE "reminderSentAt" IS NULL
  AND status IN ('PENDING', 'CONFIRMED');
