# Hospital Appointment System

Next.js (App Router) backend and admin dashboard for a Nepal hospital appointment product. The React Native app is out of scope for this phase; it should consume `/api/v1` later.

Timezone: **Asia/Kathmandu**. Slot times are stored in UTC and displayed in Nepal time.

## Stack

- Next.js 16 App Router + TypeScript
- Prisma 6 + PostgreSQL 16
- Auth.js (Credentials + JWT cookies) for the admin dashboard
- Mobile-ready JWT access/refresh tokens (`Authorization: Bearer`)
- Zod validation, Tailwind CSS + shadcn/ui
- eSewa v2 + Khalti sandbox via a `PaymentProvider` interface
- Image storage: local `uploads/` in development; Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set
- Optional FCM (in-app notifications always persist)

## Quick start

```bash
cp .env.example .env
# generate secrets for AUTH_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CRON_SECRET

npm install
npm run db:up              # docker compose postgres (requires Docker)
npm run prisma:migrate     # apply migrations (includes partial unique slot index)
npm run prisma:seed
npm run dev
```

If Docker is not installed, create a local Postgres database that matches `DATABASE_URL` in `.env` (default user/password/db: `hospital` / `hospital` / `hospital`), then run `prisma:migrate` and `prisma:seed`.

Admin dashboard: [http://localhost:3000/login](http://localhost:3000/login)

## Seed logins

All seeded passwords are `Password123!`

| Role    | Email                         | Notes                                      |
|---------|-------------------------------|--------------------------------------------|
| Admin   | `admin@hospital.local`        | Dashboard + all APIs                       |
| Doctor  | `doctor@hospital.local`       | Dr. Hari Basnet, General Medicine          |
| Patient | `patient@hospital.local`      | Demo patient                               |

Other doctors: `anisha.sharma@hospital.local`, `bikash.thapa@hospital.local`, `niraj.gurung@hospital.local`, `sita.adhikari@hospital.local`, `maya.rai@hospital.local` (same password).

Seeded hospital: **Kathmandu General Hospital** with six departments (Cardiology, Dermatology, Orthopedics, Pediatrics, Gynecology, General Medicine). Doctors work **Sunday–Friday** 09:00–13:00 and 14:00–17:00 (30 minute slots). Saturday is off.

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run prisma:migrate` | `prisma migrate deploy` |
| `npm run prisma:migrate:dev` | `prisma migrate dev` |
| `npm run prisma:seed` / `npm run db:seed` | Seed demo data |
| `npm run db:up` | Start Postgres via Docker Compose |
| `npm run build` | Generate Prisma client and production build |

## Auth model

- **Admin web:** Auth.js Credentials provider, httpOnly JWT session cookie. Only `ADMIN` users can sign in at `/login`.
- **Patients/doctors (and admin if needed):** `POST /api/v1/auth/login` returns `{ accessToken, refreshToken }`. Send `Authorization: Bearer <accessToken>`.
- `getCurrentUser()` accepts **either** the Auth.js cookie **or** a Bearer token.
- Expired access or refresh tokens return `401` with `error.code = "SESSION_EXPIRED"` and message `"Your session has expired. Please sign in again."` — the mobile app should refresh or send the user to login.
- Admin dashboard: if the web session expires mid-use, the user is redirected to `/login?reason=session_expired` and sees the same message.

### Vercel production

Set these on the project (Settings → Environment Variables). Redeploy after changing them.

| Variable | Production value |
|----------|------------------|
| `DATABASE_URL` | Prisma Postgres URL (name must be `DATABASE_URL`, not `DB_DATABASE_URL`) |
| `AUTH_SECRET` | `openssl rand -base64 32` (required; do not leave the example placeholder) |
| `AUTH_URL` | **Unset**, or `https://your-app.vercel.app` — never `http://localhost:3000` |

## API conventions

All `/api/v1` JSON responses:

```json
{ "success": true, "data": {}, "error": { "code": "", "message": "" }, "meta": {} }
```

Mutating routes validate with Zod. Protected routes use RBAC (`PATIENT` | `DOCTOR` | `ADMIN`). Inactive accounts receive `ACCOUNT_INACTIVE`. Concurrent double-booking hits a Postgres partial unique index and returns `409 SLOT_UNAVAILABLE`.

CORS origins come from `CORS_ORIGINS` (Expo defaults included).

## `/api/v1` reference

### Auth
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/register` | public (creates PATIENT) |
| POST | `/api/v1/auth/login` | public |
| POST | `/api/v1/auth/refresh` | refresh token body |
| POST | `/api/v1/auth/logout` | Bearer |
| POST | `/api/v1/auth/forgot-password` | public (dev: logs reset URL) |
| POST | `/api/v1/auth/reset-password` | public |
| GET | `/api/v1/auth/me` | cookie or Bearer |

### Profile
| Method | Path | Auth |
|--------|------|------|
| GET/PATCH | `/api/v1/me` | any role |
| POST | `/api/v1/me/photo` | multipart `file` or `photo` |

### Catalog
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/hospitals/current` | public |
| GET | `/api/v1/departments` | public |
| POST | `/api/v1/departments` | ADMIN |
| GET/PATCH | `/api/v1/departments/:id` | GET public, PATCH ADMIN |
| POST | `/api/v1/departments/:id/activate` | ADMIN |
| POST | `/api/v1/departments/:id/deactivate` | ADMIN |
| GET/POST | `/api/v1/specializations` | POST ADMIN |
| PATCH/DELETE | `/api/v1/specializations/:id` | ADMIN |
| GET | `/api/v1/doctors` | public search (`q`, `departmentId`, `specializationId`, `available`, `minFee`, `maxFee`, `sort=name\|fee\|fee_desc\|experience`) |
| POST | `/api/v1/doctors` | ADMIN |
| GET | `/api/v1/doctors/:id` | public profile |
| PATCH | `/api/v1/doctors/:id` | ADMIN or that doctor |
| POST | `/api/v1/doctors/:id/activate` | ADMIN |
| POST | `/api/v1/doctors/:id/deactivate` | ADMIN |

### Schedules & slots
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/doctors/:id/slots?date=YYYY-MM-DD` | public |
| GET/PUT | `/api/v1/doctors/:id/schedule` | doctor/admin (PUT replaces weekly hours + breaks) |
| GET/POST | `/api/v1/doctors/:id/unavailability` | doctor/admin |
| DELETE | `/api/v1/doctors/:id/unavailability/:unavailabilityId` | doctor/admin |

Slots are **computed** from weekday hours minus breaks, unavailability, and occupied appointments. Clients must send a `startAt` that matches a generated free slot; the server recomputes and does not trust client `endAt`.

### Appointments
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/appointments` | role-scoped list |
| POST | `/api/v1/appointments` | PATIENT `{ doctorId, startAt, notes? }` |
| GET | `/api/v1/appointments/:id` | owner / assigned doctor / admin |
| POST | `/api/v1/appointments/:id/cancel` | owner / doctor / admin |
| POST | `/api/v1/appointments/:id/reschedule` | `{ startAt, reason? }` |
| PATCH | `/api/v1/appointments/:id/status` | doctor/admin `{ status: CONFIRMED\|COMPLETED\|NO_SHOW }` — `CONFIRMED` is rejected while payment is still required and unpaid |

Booking: doctor must be active, slot free and not in the past. If `hospital.paymentRequired` and the doctor’s consultation fee is greater than 0, the appointment stays `PENDING` until a linked payment is `SUCCESS` (eSewa/Khalti verify or admin cash). Staff cannot PATCH `PENDING` → `CONFIRMED` while unpaid. If payment is not required (or the fee is 0), the booking is auto-`CONFIRMED`.

Cancel is blocked when `now + cancellationHours >= startAt` (admin can override). Reschedule marks the old row `RESCHEDULED` (frees the unique slot) and creates a new appointment. An unpaid reschedule stays `PENDING`; a visit that already has a `SUCCESS` payment is created as `CONFIRMED`.

Statuses: `PENDING` (awaiting payment when required) → `CONFIRMED` (after payment success, or immediately when payment is not required) → `COMPLETED` | `NO_SHOW`, or `CANCELLED` / `RESCHEDULED`.

### Payments
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/payments/initiate` | `{ appointmentId, provider: ESEWA\|KHALTI }` |
| POST | `/api/v1/payments/verify` | `{ provider, transactionUuid? \| pidx? }` |
| GET | `/api/v1/payments` | ADMIN |
| GET | `/api/v1/payments/:id` | owner/admin |
| GET | `/api/v1/payments/:id/receipt` | after SUCCESS (`HAS-YYYYMMDD-#####`) |
| POST | `/api/v1/payments/:id/cash` | ADMIN |
| GET | `/api/v1/payments/esewa/success` | eSewa redirect |
| GET | `/api/v1/payments/esewa/failure` | eSewa redirect |
| GET | `/api/v1/payments/khalti/return` | Khalti redirect |

Successful verify or cash mark-paid → `Payment.status = SUCCESS` and the appointment becomes `CONFIRMED` (notifications sent). Failed verify → `Payment.status = FAILED`, appointment stays `PENDING`.

### Notifications & devices
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/notifications` | current user (`?unread=true`) |
| PATCH | `/api/v1/notifications/:id/read` | owner |
| POST | `/api/v1/notifications/read-all` | owner |
| POST | `/api/v1/devices` | `{ token, platform? }` FCM token |

If `FCM_SERVER_KEY` is empty, push is skipped and in-app `Notification` rows still exist.

### Dashboards
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/dashboard/patient` | PATIENT |
| GET | `/api/v1/dashboard/doctor` | DOCTOR |
| GET | `/api/v1/dashboard/admin` | ADMIN |

### Admin APIs
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/admin/patients` | ADMIN |
| PATCH | `/api/v1/admin/patients/:id/status` | `{ status: ACTIVE\|INACTIVE }` |
| GET | `/api/v1/admin/appointments` | ADMIN |
| GET | `/api/v1/admin/reports?days=14` | ADMIN |
| GET/PATCH | `/api/v1/admin/settings` | hospital profile, cancellation window, payment required |

### Uploads & cron
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/uploads/:path*` | public file serve from `uploads/` |
| GET | `/api/cron/reminders` | `Authorization: Bearer $CRON_SECRET` |

Vercel Cron is configured in `vercel.json` as **once daily** (`0 3 * * *`, 03:00 UTC ≈ 08:45 Asia/Kathmandu) so it works on the **Hobby** plan (Hobby cannot run hourly/minute crons). Set `CRON_SECRET` in Vercel env; keep `REMINDER_HOURS=24` so each daily run covers the next day’s appointments.

## Booking example (mobile later)

```bash
# login
curl -s http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"patient@hospital.local","password":"Password123!"}'

# list doctors
curl -s 'http://localhost:3000/api/v1/doctors?departmentId=&sort=fee'

# slots for a date (Nepal calendar date)
curl -s 'http://localhost:3000/api/v1/doctors/DOCTOR_ID/slots?date=2026-09-14'

# book using an available startAt from the slots payload
curl -s http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"doctorId":"DOCTOR_ID","startAt":"2026-09-14T03:15:00.000Z"}'
```

## Payments (sandbox)

Set eSewa / Khalti keys in `.env`. Test product code `EPAYTEST` is prefilled. Khalti amounts are sent in **paisa**. Cash/pay-at-hospital is an admin action.

## Double-booking protection

Migration SQL:

```sql
CREATE UNIQUE INDEX appointment_active_slot_unique
ON "Appointment" ("doctorId", "startAt")
WHERE status NOT IN ('CANCELLED', 'RESCHEDULED');
```

Book and reschedule run in `prisma.$transaction`.

## Known gaps (intentionally out of scope)

- React Native / Expo client
- Production SMTP (reset links are logged in development)
- Real S3 wiring (adapter interface is ready)
- Live FCM unless `FCM_SERVER_KEY` is set
- Telemedicine, EMR, pharmacy/lab, AI

