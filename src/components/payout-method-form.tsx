"use client";

import { useActionState, useState } from "react";
import { Landmark, Smartphone } from "lucide-react";
import { savePayoutMethod } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { submitKeepingValues } from "@/components/ui/keep-form";
import { formatIban, MOBILE_OPERATORS, type PayoutMethod } from "@/lib/payout";
import { useT } from "@/i18n/client";

/** Saisie du moyen de versement : IBAN (Europe) ou Mobile Money (Afrique). */
export function PayoutMethodForm({ current, holder }: { current: PayoutMethod | null; holder: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(savePayoutMethod, null);
  const [kind, setKind] = useState<"iban" | "mobile_money">(current?.kind ?? "iban");
  return (
    <form action={action} onSubmit={submitKeepingValues(action)} className="space-y-5">
      <fieldset>
        <legend className="text-sm font-semibold">{t("Comment voulez-vous être payé ?")}</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["iban", Landmark, "Virement bancaire", "IBAN d'un compte en Europe"],
              ["mobile_money", Smartphone, "Mobile Money", "Orange, MTN, Wave, Moov…"],
            ] as const
          ).map(([v, Icon, label, hint]) => (
            <label key={v} className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line bg-white p-4 has-checked:border-brand has-checked:bg-brand-pale/40">
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="mt-1 h-4 w-4 accent-brand" />
              <span>
                <span className="flex items-center gap-2 font-bold">
                  <Icon className="h-5 w-5 text-brand" aria-hidden="true" /> {t(label)}
                </span>
                <span className="block text-sm text-muted">{t(hint)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={t("Titulaire")} htmlFor="holder_name" hint={t("Le nom exact du compte. Il doit correspondre à votre identité vérifiée.")}>
        <Input id="holder_name" name="holder_name" autoComplete="name" required maxLength={100} defaultValue={current?.holder_name ?? holder} />
      </Field>

      {kind === "iban" ? (
        <>
          <Field label={t("IBAN")} htmlFor="iban">
            <Input
              id="iban"
              name="iban"
              required
              inputMode="text"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="FR76 3000 6000 0112 3456 7890 189"
              defaultValue={current?.iban ? formatIban(current.iban) : ""}
              className="tabular uppercase"
            />
          </Field>
          <Field label={t("BIC (facultatif)")} htmlFor="bic">
            <Input id="bic" name="bic" maxLength={11} autoCapitalize="characters" spellCheck={false} placeholder="BNPAFRPP" defaultValue={current?.bic ?? ""} className="uppercase" />
          </Field>
        </>
      ) : (
        <>
          <Field label={t("Opérateur")} htmlFor="mobile_operator">
            <Select id="mobile_operator" name="mobile_operator" required defaultValue={current?.mobile_operator ?? ""}>
              <option value="" disabled>
                {t("Choisir")}
              </option>
              {MOBILE_OPERATORS.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(o.label)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Numéro Mobile Money")} htmlFor="mobile_number" hint={t("Au format international, avec l'indicatif du pays.")}>
            <Input id="mobile_number" name="mobile_number" type="tel" required placeholder="+237 6 12 34 56 78" defaultValue={current?.mobile_number ?? ""} />
          </Field>
          <Field label={t("Pays")} htmlFor="country">
            <Input id="country" name="country" maxLength={60} placeholder="Cameroun" defaultValue={current?.country ?? ""} />
          </Field>
        </>
      )}

      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("Enregistrement…") : current ? t("Mettre à jour") : t("Enregistrer mon moyen de versement")}
      </Button>
    </form>
  );
}
