import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Bell,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Gift,
  KeyRound,
  Landmark,
  LifeBuoy,
  LogOut,
  MapPin,
  Package,
  Plane,
  Receipt,
  ShieldCheck,
  Star,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { AmbassadorBadge } from "@/components/ambassador-badge";
import { Avatar } from "@/components/avatar";
import { startIdentityCheck } from "@/app/actions/verification";
import { ProfileForm } from "@/components/account-forms";
import { AvatarUploader, PhoneVerifier } from "@/components/onboarding-forms";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { AddressVerificationForm, IdentityVerificationForm } from "@/components/verification-forms";
import { getProfile } from "@/lib/data";
import { isStripeConfigured } from "@/lib/stripe";
import { createClient, getUserId } from "@/lib/supabase/server";
import { maskIban, maskPhone, operatorLabel, type PayoutMethod } from "@/lib/payout";
import { getLocale, getT } from "@/i18n/server";
import { BackLink } from "@/components/ui/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Mon profil"), robots: { index: false } };
}

type Request = { status: "pending" | "approved" | "rejected"; rejection_reason: string | null } | undefined;

async function Step({ id, done, pending, title, children }: { id?: string; done: boolean; pending?: boolean; title: string; children?: ReactNode }) {
  const t = await getT();
  const Icon = done ? CheckCircle2 : pending ? Clock : Circle;
  return (
    <li id={id} className="scroll-mt-24 rounded-2xl bg-white p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 font-semibold">
        <Icon className={`h-5 w-5 ${done ? "text-ok" : pending ? "text-signal-deep" : "text-muted"}`} aria-hidden="true" />
        {title}
        {done && <span className="ml-auto text-sm font-medium text-ok">{t("Vérifié")}</span>}
        {pending && !done && <span className="ml-auto text-sm font-medium text-muted">{t("En cours d'examen")}</span>}
      </p>
      {!done && children && <div className="mt-4">{children}</div>}
    </li>
  );
}

async function Rejected({ request }: { request: Request }) {
  const t = await getT();
  if (request?.status !== "rejected") return null;
  return (
    <p role="alert" className="mb-4 rounded-xl bg-danger-pale px-4 py-3 text-sm text-danger">
      {t("Votre dernière demande a été refusée : {rejection_reason}. Vous pouvez en envoyer une nouvelle.", { rejection_reason: request.rejection_reason ?? "" })}
    </p>
  );
}

/** Ligne de menu de l'onglet « Compte », à la manière des applications de covoiturage. */
async function MenuRow({ href, icon: Icon, label, hint, tone }: { href: string; icon: LucideIcon; label: string; hint?: string; tone?: "warn" }) {
  const external = href.startsWith("mailto:");
  const cls = "flex items-center gap-4 px-5 py-4 hover:bg-paper";
  const inner = (
    <>
      <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{label}</span>
        {hint && <span className={`block truncate text-sm ${tone === "warn" ? "font-semibold text-signal-deep" : "text-muted"}`}>{hint}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
    </>
  );
  return (
    <li>
      {external ? (
        <a href={href} className={cls}>
          {inner}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      )}
    </li>
  );
}

const MenuGroup = ({ children }: { children: ReactNode }) => (
  <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-white ring-1 ring-line">{children}</ul>
);

async function AccountTab({ payout, autoPayout }: { payout: PayoutMethod | null; autoPayout: boolean }) {
  const t = await getT();
  const payoutHint = autoPayout
    ? t("Virements automatiques activés")
    : !payout
    ? t("À ajouter pour recevoir vos gains")
    : payout.kind === "iban"
      ? t("Virement · {iban}", { iban: maskIban(payout.iban ?? "") })
      : `${t(operatorLabel(payout.mobile_operator))} · ${maskPhone(payout.mobile_number ?? "")}`;
  return (
    <div className="mt-6 space-y-5">
      <MenuGroup>
        <MenuRow href="/espace/profil/versement" icon={Landmark} label={t("Moyen de versement")} hint={payoutHint} tone={payout || autoPayout ? undefined : "warn"} />
        <MenuRow href="/espace/profil/versements" icon={Wallet} label={t("Versements reçus")} hint={t("Vos gains de voyageur et vos primes")} />
        <MenuRow href="/espace/profil/paiements" icon={Receipt} label={t("Paiements et remboursements")} hint={t("Vos envois payés et remboursés")} />
      </MenuGroup>
      <MenuGroup>
        <MenuRow href="/notifications" icon={Bell} label={t("Préférences de notification")} hint={t("E-mail, téléphone, WhatsApp")} />
        <MenuRow href="/nouveau-mot-de-passe" icon={KeyRound} label={t("Mot de passe")} />
        <MenuRow href="/espace/profil#adresse" icon={MapPin} label={t("Adresse postale")} />
      </MenuGroup>
      <MenuGroup>
        <MenuRow href="/espace/parrainage" icon={Gift} label={t("Parrainage")} hint={t("5 € pour vous, 5 € pour eux")} />
        <MenuRow href="/espace/ambassadeur" icon={Award} label={t("Programme Ambassadeur")} />
      </MenuGroup>
      <MenuGroup>
        <MenuRow href="/comment-ca-marche" icon={LifeBuoy} label={t("Aide")} hint={t("Comment ça marche, sécurité, objets interdits")} />
        <MenuRow href="/cgu" icon={FileText} label={t("Conditions d'utilisation")} />
        <MenuRow href="/confidentialite" icon={ShieldCheck} label={t("Protection des données")} />
      </MenuGroup>
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
        <form action={signOut}>
          <button type="submit" className="flex w-full items-center gap-4 px-5 py-4 text-left font-semibold text-brand hover:bg-paper">
            <LogOut className="h-5 w-5" aria-hidden="true" /> {t("Se déconnecter")}
          </button>
        </form>
        <a
          href={`mailto:support@send-by-me.com?subject=${encodeURIComponent("Fermer mon compte Send By Me")}`}
          className="flex items-center gap-4 border-t border-line px-5 py-4 font-semibold text-danger hover:bg-danger-pale/40"
        >
          <UserX className="h-5 w-5" aria-hidden="true" /> {t("Fermer mon compte")}
        </a>
      </div>
    </div>
  );
}

async function Profile({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const lang = await getLocale();
  const userId = await getUserId();
  if (!userId) redirect("/connexion?suite=/espace/profil");
  const [profile, sp] = await Promise.all([getProfile(userId), searchParams]);
  if (!profile) redirect("/espace");
  const supabase = await createClient();
  const tab = sp.onglet === "compte" ? "compte" : "apropos";
  const [{ data: requests }, { data: contact }, { data: payout }, { count: trips }, { count: sendings }, { data: connect }] = await Promise.all([
    supabase
      .from("identity_verifications")
      .select("kind, status, rejection_reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("member_contacts").select("phone, phone_verified_at, address_line, postal_code, address_city, country").eq("user_id", userId).maybeSingle(),
    supabase.from("payout_methods").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("traveler_id", userId),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("sender_id", userId).in("status", ["paid", "picked_up", "delivered"]),
    supabase.from("stripe_connect_accounts").select("transfers_active").eq("user_id", userId).maybeSingle(),
  ]);
  const autoPayout = !!connect?.transfers_active;
  const last = (kind: string) => (requests ?? []).find((r) => r.kind === kind) as Request;
  const idReq = last("identity");
  const addrReq = last("address");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <BackLink href="/espace" label={t("Mon espace")} />
      <h1 className="sr-only">{t("Mon profil")}</h1>

      <section className="mt-4 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.full_name || "?"} src={profile.avatar_url} verified={profile.id_verified} certified={profile.certified} size={72} />
          <div className="min-w-0 flex-1">
            <p className="display truncate text-2xl sm:text-3xl">{profile.full_name.split(" ")[0] || profile.full_name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {profile.ambassador_since ? <AmbassadorBadge /> : profile.certified ? t("Compte certifié") : profile.id_verified ? t("Identité vérifiée") : t("Membre")}
            </div>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-center">
          {(
            [
              [Plane, trips ?? 0, t("Trajets publiés")],
              [Package, sendings ?? 0, t("Colis envoyés")],
              [Star, profile.rating_count ? (profile.rating_avg ?? 0).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 1 }) : "—", t("{n} avis", { n: profile.rating_count ?? 0 })],
            ] as const
          ).map(([Icon, value, label]) => (
            <div key={label} className="rounded-xl bg-white px-2 py-3">
              <Icon className="mx-auto h-5 w-5 text-brand" aria-hidden="true" />
              <dd className="tabular mt-1 text-xl font-extrabold">{value}</dd>
              <dt className="text-xs text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <nav className="mt-5 grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-line" aria-label={t("Sections du profil")}>
        {(
          [
            ["apropos", t("À propos de vous")],
            ["compte", t("Compte")],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "apropos" ? "/espace/profil" : "/espace/profil?onglet=compte"}
            aria-current={tab === key ? "page" : undefined}
            className={`rounded-xl px-3 py-2.5 text-center font-semibold transition ${tab === key ? "bg-ink text-white" : "text-ink-soft hover:bg-paper"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "compte" ? (
        <AccountTab payout={payout as PayoutMethod | null} autoPayout={autoPayout} />
      ) : (
      <>
      <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="verifie">
        <h2 id="verifie" className="text-lg font-bold">
          {profile.id_verified ? t("Vous avez un profil vérifié") : t("Votre profil")}
        </h2>
        <ul className="mt-4 space-y-3">
          {(
            [
              [profile.id_verified, t("Pièce d'identité vérifiée"), t("Pièce d'identité à vérifier")],
              [true, t("E-mail confirmé"), ""],
              [!!contact?.phone_verified_at, t("Téléphone vérifié"), t("Téléphone à vérifier")],
              [!!profile.address_verified, t("Adresse vérifiée"), t("Adresse à vérifier")],
              [!!payout || autoPayout, t("Moyen de versement enregistré"), t("Moyen de versement à ajouter")],
            ] as const
          ).map(([ok, yes, no]) => (
            <li key={yes} className="flex items-center gap-3">
              {ok ? <CheckCircle2 className="h-6 w-6 text-brand" aria-hidden="true" /> : <Circle className="h-6 w-6 text-muted" aria-hidden="true" />}
              <span className={ok ? "font-medium" : "text-muted"}>{ok ? yes : no}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 space-y-5 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <AvatarUploader userId={userId} current={profile.avatar_url} name={profile.full_name || t("vous")} />
        <div className="border-t border-line pt-5">
          <h2 className="mb-3 font-bold">{t("Téléphone")}</h2>
          <PhoneVerifier verifiedPhone={contact?.phone_verified_at ? (contact.phone as string) : null} />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="certif">
        {profile.certified ? (
          <div className="flex items-center gap-4 rounded-3xl bg-ink p-6 text-white">
            <ShieldCheck className="h-12 w-12 shrink-0 rounded-full bg-signal p-2 text-ink" aria-hidden="true" />
            <div>
              <h2 id="certif" className="text-lg font-bold">
                {t("Compte certifié")}
              </h2>
              <p className="text-white/75">{t("Identité et adresse vérifiées. Le badge doré est affiché sur votre profil et vos trajets.")}</p>
            </div>
          </div>
        ) : (
          <>
            <h2 id="certif" className="text-xl font-bold">
              {t("Faites certifier votre compte")}
            </h2>
            <p className="mt-1 text-muted">
              {t("Votre identité vous donne le badge bleu, votre adresse le badge doré. Les membres certifiés reçoivent plus de demandes. Vos documents restent privés et sont effacés après contrôle.")}
            </p>
          </>
        )}

        <ol className="mt-4 space-y-3">
          <Step done title={t("E-mail confirmé")} />
          <Step done={profile.id_verified} pending={idReq?.status === "pending"} title={t("Identité")}>
            {idReq?.status === "pending" ? (
              <p className="text-sm text-muted">{t("Notre équipe examine vos documents, en général sous 24 heures.")}</p>
            ) : (
              <>
                <Rejected request={idReq} />
                {isStripeConfigured ? (
                  <>
                    <div className="rounded-2xl bg-brand-pale/50 p-4">
                      <p className="font-semibold">{t("Vérification en 2 minutes")}</p>
                      <p className="mt-1 mb-3 text-sm text-ink-soft">{t("Une photo de votre pièce, un selfie, et c'est fait. Le résultat arrive tout seul.")}</p>
                      {sp.kyc === "retour" && (
                        <p role="status" className="mb-3 text-sm font-medium text-ok">
                          {t("Merci ! Le résultat s'affichera ici dans quelques instants.")}
                        </p>
                      )}
                      <form action={startIdentityCheck}>
                        <Button type="submit" size="sm">
                          <BadgeCheck className="h-4 w-4" aria-hidden="true" />{" "}{t("Vérifier mon identité")}
                        </Button>
                      </form>
                    </div>
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-muted hover:text-ink">{t("Ça ne marche pas ? Envoyez vos documents")}</summary>
                      <div className="mt-3">
                        <IdentityVerificationForm userId={userId} />
                      </div>
                    </details>
                  </>
                ) : (
                  <IdentityVerificationForm userId={userId} />
                )}
              </>
            )}
          </Step>
          <Step id="adresse" done={!!profile.address_verified} pending={addrReq?.status === "pending"} title={t("Adresse et téléphone")}>
            {addrReq?.status === "pending" ? (
              <p className="text-sm text-muted">{t("Votre justificatif de domicile est en cours d'examen.")}</p>
            ) : (
              <>
                <Rejected request={addrReq} />
                <AddressVerificationForm userId={userId} contact={contact} />
              </>
            )}
          </Step>
        </ol>
      </section>

      <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="mb-1 text-lg font-bold">{t("Profil public")}</h2>
        <p className="mb-5 text-sm text-muted">{t("Ces informations sont visibles par les autres membres.")}</p>
        <ProfileForm profile={profile} />
      </div>
      </>
      )}
    </div>
  );
}

export default function ProfilePage(props: PageProps<"/[lang]/espace/profil">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-2xl" />}>
        <Profile searchParams={props.searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </PageShell>
  );
}
