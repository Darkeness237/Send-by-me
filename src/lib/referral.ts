import { SITE_URL } from "@/lib/env";

/** Crédit offert au filleul à l'inscription et au parrain après la première livraison du filleul (voir la migration referrals). */
export const REFERRAL_REWARD_CENTS = 500;

export const REFERRAL_CODE_RE = /^[A-Z0-9]{6,12}$/;

export function cleanReferralCode(raw: unknown) {
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return REFERRAL_CODE_RE.test(code) ? code : null;
}

export function referralLink(code: string) {
  return `${SITE_URL}/inscription?parrain=${code}`;
}
