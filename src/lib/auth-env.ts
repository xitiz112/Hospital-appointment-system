/**
 * Auth.js reads AUTH_URL from the environment. Copying local .env to Vercel
 * leaves AUTH_URL=http://localhost:3000, so sign-in redirects and cookies
 * target localhost instead of the deployed host.
 */
if (process.env.VERCEL && /localhost|127\.0\.0\.1/.test(process.env.AUTH_URL ?? "")) {
  delete process.env.AUTH_URL;
}
