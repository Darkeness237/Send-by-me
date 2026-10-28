import "server-only";

import { SITE_URL } from "@/lib/env";
import { notifySafe } from "@/lib/notify";
import { euros } from "@/lib/pricing";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Virements automatiques aux voyageurs avec Stripe Connect :
// – compte « destinataire de virements » (contrat recipient) avec le tableau de bord Express, frais et pertes portés par Send By Me ;
// – Send By Me encaisse le paiement de l'expéditeur, garde l'argent, puis transfère la part du voyageur
//   (« separate charges and transfers ») dès que la livraison est validée par le code du destinataire.

/** Pays où Stripe peut verser sur un compte bancaire depuis une plateforme française. Les autres : Mobile Money, à la main. */
export const CONNECT_COUNTRIES = [
  ["FR", "France"],
  ["BE", "Belgique"],
  ["LU", "Luxembourg"],
  ["CH", "Suisse"],
  ["DE", "Allemagne"],
  ["IT", "Italie"],
  ["ES", "Espagne"],
  ["PT", "Portugal"],
  ["NL", "Pays-Bas"],
  ["IE", "Irlande"],
  ["AT", "Autriche"],
  ["GB", "Royaume-Uni"],
] as const;

export type ConnectAccount = { account_id: string; country: string; transfers_active: boolean };

export async function getConnectAccount(userId: string): Promise<ConnectAccount | null> {
  const { data } = await createAdminClient().from("stripe_connect_accounts").select("account_id, country, transfers_active").eq("user_id", userId).maybeSingle();
  return data as ConnectAccount | null;
}

export const isConnectCountry = (country: string) => CONNECT_COUNTRIES.some(([c]) => c === country);

/** Devise du compte bancaire selon le pays de l'IBAN (Stripe convertit les virements en euros). */
const bankCurrency = (country: string) => (country === "GB" ? "gbp" : country === "CH" ? "chf" : "eur");

export type BankDetails = { iban: string; holder: string };

const bankAccount = (country: string, bank: BankDetails) => ({
  object: "bank_account" as const,
  country,
  currency: bankCurrency(country),
  account_number: bank.iban,
  account_holder_name: bank.holder.slice(0, 100),
  account_holder_type: "individual" as const,
});

/**
 * Crée (une seule fois) le compte connecté du voyageur, prérempli avec son nom, son e-mail et son IBAN :
 * Stripe ne lui demande plus que de confirmer son identité. Compte existant : l'IBAN y est mis à jour.
 */
export async function ensureConnectAccount(userId: string, country: string, email: string | null, name: string, bank?: BankDetails) {
  const existing = await getConnectAccount(userId);
  if (existing) {
    if (bank && existing.country === country) {
      await stripe().accounts.createExternalAccount(existing.account_id, { external_account: bankAccount(country, bank), default_for_currency: true });
    }
    return existing.account_id;
  }
  const [first, ...rest] = (bank?.holder || name).trim().split(/\s+/);
  const account = await stripe().accounts.create(
    {
      country,
      email: email ?? undefined,
      business_type: "individual",
      individual: { email: email ?? undefined, first_name: first || undefined, last_name: rest.join(" ") || undefined },
      controller: {
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
        stripe_dashboard: { type: "express" },
      },
      capabilities: { transfers: { requested: true } },
      // Le voyageur ne fait que recevoir des virements : contrat « destinataire ».
      tos_acceptance: { service_agreement: "recipient" },
      business_profile: { product_description: "Voyageur Send By Me : transport de colis entre particuliers" },
      external_account: bank ? bankAccount(country, bank) : undefined,
      metadata: { user_id: userId },
    },
    { idempotencyKey: `connect-account-${userId}-${country}-${bank?.iban.slice(-6) ?? "sans-iban"}` },
  );
  await createAdminClient().from("stripe_connect_accounts").insert({ user_id: userId, account_id: account.id, country });
  return account.id;
}

/** Lien vers le formulaire Stripe : identité, adresse et IBAN du voyageur. */
export async function onboardingUrl(accountId: string) {
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${SITE_URL}/espace/profil/versement/stripe`,
    return_url: `${SITE_URL}/espace/profil/versement?stripe=retour`,
    collection_options: { fields: "eventually_due" },
  });
  return link.url;
}

/** Relit chez Stripe si le compte peut recevoir des virements, et met la base à jour. */
export async function syncConnectAccount(userId: string): Promise<ConnectAccount | null> {
  const acc = await getConnectAccount(userId);
  if (!acc) return null;
  try {
    const account = await stripe().accounts.retrieve(acc.account_id);
    const active = account.capabilities?.transfers === "active" && account.payouts_enabled;
    if (active !== acc.transfers_active) {
      await createAdminClient().from("stripe_connect_accounts").update({ transfers_active: active, updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (active) await payDueBookings(userId);
    }
    return { ...acc, transfers_active: active };
  } catch (e) {
    console.error("Compte Stripe du voyageur", userId, e instanceof Error ? e.message : e);
    return acc;
  }
}

/** Lien vers le tableau de bord Stripe Express du voyageur (ses virements, son IBAN). */
export async function expressDashboardUrl(accountId: string) {
  const link = await stripe().accounts.createLoginLink(accountId);
  return link.url;
}

/**
 * Verse au voyageur sa part d'une réservation livrée, si son compte Stripe est actif.
 * Idempotent : un seul virement par réservation, même en cas de double appel.
 * Renvoie l'identifiant du virement, ou null si la réservation reste à verser à la main.
 */
export async function payTraveler(bookingId: string): Promise<string | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, base_cents, payout_status, stripe_payment_intent_id, trip:trips(id, traveler_id, boost_fee_cents, boost_settled_booking, from_city, to_city)")
    .eq("id", bookingId)
    .maybeSingle();
  const trip = b && (Array.isArray(b.trip) ? b.trip[0] : b.trip);
  if (!b || !trip || b.payout_status !== "due") return null;
  const acc = await getConnectAccount(trip.traveler_id as string);
  if (!acc?.transfers_active) return null;

  // Mise en avant payante : retenue une seule fois, sur le premier versement du trajet.
  const boost = (trip.boost_fee_cents as number) > 0 && !trip.boost_settled_booking ? (trip.boost_fee_cents as number) : 0;
  const amount = (b.base_cents as number) - boost;
  if (amount <= 0) return null;

  try {
    // Rattaché au paiement de l'expéditeur : le virement part même si ces fonds ne sont pas encore disponibles.
    let sourceCharge: string | undefined;
    if (b.stripe_payment_intent_id) {
      const pi = await stripe().paymentIntents.retrieve(b.stripe_payment_intent_id as string);
      sourceCharge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
    }
    const transfer = await stripe().transfers.create(
      {
        amount,
        currency: "eur",
        destination: acc.account_id,
        source_transaction: sourceCharge,
        transfer_group: `booking_${b.id}`,
        description: `Send By Me ${trip.from_city} → ${trip.to_city}`,
        metadata: { booking_id: b.id as string, boost_cents: String(boost) },
      },
      { idempotencyKey: `payout-${b.id}` },
    );
    const { data: updated } = await admin
      .from("bookings")
      .update({ payout_status: "paid", payout_reference: transfer.id, paid_out_at: new Date().toISOString() })
      .eq("id", b.id)
      .eq("payout_status", "due")
      .select("id");
    if (updated?.length && boost) {
      await admin.from("trips").update({ boost_settled_booking: b.id }).eq("id", trip.id as string).is("boost_settled_booking", null);
    }
    await notifySafe(trip.traveler_id as string, {
      kind: "payout_sent",
      title: `Virement de ${euros(amount)} envoyé`,
      body: `Votre part pour ${trip.from_city} → ${trip.to_city} est en route vers votre compte bancaire.`,
      href: "/espace/profil/versements",
      email: true,
    });
    return transfer.id;
  } catch (e) {
    // Le versement reste « à verser » : l'administration le voit et peut relancer.
    console.error("Virement Stripe au voyageur", bookingId, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Compte tout juste activé : on verse ce qui attendait déjà. */
async function payDueBookings(userId: string) {
  const { data } = await createAdminClient().from("bookings").select("id, trip:trips!inner(traveler_id)").eq("trip.traveler_id", userId).eq("payout_status", "due").limit(50);
  for (const row of data ?? []) await payTraveler(row.id as string);
}
