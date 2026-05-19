import { Resend } from "resend";

// Lazy singleton — Resend client is created on first use so missing env doesn't
// crash imports. Returns null if RESEND_API_KEY isn't set, letting callers
// fail soft (the action itself still succeeds without the email).
let cached: Resend | null = null;

export function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

// Must be an address on a Resend-verified domain, or Resend's sandbox sender
// (which only delivers to the Resend account owner's address).
export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "NextQuest <noreply@nextquests.com>";
}
