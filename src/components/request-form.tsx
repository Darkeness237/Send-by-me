"use client";

import { ImagePlus, Loader2, PackageCheck, X } from "lucide-react";
import { useActionState, useState } from "react";
import { createRequest } from "@/app/actions/requests";
import { ParcelPreview } from "@/components/publish-previews";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { submitKeepingValues } from "@/components/ui/keep-form";
import { useCitySearch } from "@/components/use-city-search";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, groupedCategories } from "@/lib/types";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const BUCKET = "request-photos";

export function RequestForm({
  userId,
  defaults,
}: {
  userId: string;
  defaults?: { from?: string; to?: string };
}) {
  const [state, action, pending] = useActionState(createRequest, null);
  const [fromCity, setFromCity] = useState(defaults?.from ?? "");
  const [toCity, setToCity] = useState(defaults?.to ?? "");
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const from = useCitySearch(fromCity);
  const to = useCitySearch(toCity);
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<Record<string, string>>({
    weight_kg: "5",
  });

  async function addPhotos(files: FileList) {
    setPhotoError(null);
    setUploading(true);
    const supabase = createClient();
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const ext = TYPES[file.type];
      if (!ext || file.size > 5 * 1024 * 1024) {
        setPhotoError("Photos JPG, PNG ou WEBP de 5 Mo maximum.");
        continue;
      }
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (error) setPhotoError("Une photo n'a pas pu être envoyée.");
      else
        setPhotos((p) => [
          ...p,
          {
            path,
            url: supabase.storage.from(BUCKET).getPublicUrl(path).data
              .publicUrl,
          },
        ]);
    }
    setUploading(false);
  }

  const dims = [values.length_cm, values.width_cm, values.height_cm].every(
    Boolean,
  )
    ? `${values.length_cm} × ${values.width_cm} × ${values.height_cm} cm`
    : undefined;
  const preview = (
    <ParcelPreview
      from={fromCity}
      to={toCity}
      fromIata={from.selected?.airports[0]?.iata}
      toIata={to.selected?.airports[0]?.iata}
      category={values.category}
      kg={Number(values.weight_kg) || 0}
      dims={dims}
      photos={photos.map((p) => p.url)}
      homeDelivery={values.wants_home_delivery === "on"}
      latest={values.latest_date}
    />
  );

  const section =
    "reveal space-y-5 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8";
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <form
        action={action}
        onSubmit={submitKeepingValues(action)}
        onChange={(e) => {
          const t = e.target as unknown as HTMLInputElement;
          if (!t.name || t.type === "file") return;
          const value =
            t.type === "checkbox" ? (t.checked ? "on" : "") : t.value;
          setValues((v) => ({ ...v, [t.name]: value }));
        }}
        className="space-y-6"
      >
        {[
          ["req-from", from.options],
          ["req-to", to.options],
        ].map(([id, list]) => (
          <datalist key={id as string} id={id as string}>
            {(list as typeof from.options).map((o) => (
              <option
                key={`${o.city}-${o.country}`}
                value={`${o.city}, ${o.country}`}
              />
            ))}
          </datalist>
        ))}
        {photos.map((p) => (
          <input key={p.path} type="hidden" name="photos" value={p.path} />
        ))}

        <fieldset className={section}>
          <legend className="sr-only">Trajet souhaité</legend>
          <h2 className="flex items-center gap-3 text-lg font-bold">
            <Step n={1} />
            Où et quand ?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ville de départ" htmlFor="from_city">
              <Input
                id="from_city"
                name="from_city"
                list="req-from"
                required
                autoComplete="off"
                placeholder="Paris, France"
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
              />
            </Field>
            <Field label="Ville d'arrivée" htmlFor="to_city">
              <Input
                id="to_city"
                name="to_city"
                list="req-to"
                required
                autoComplete="off"
                placeholder="Douala, Cameroun"
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
              />
            </Field>
            <Field label="À partir du" htmlFor="earliest_date">
              <Input
                id="earliest_date"
                name="earliest_date"
                type="date"
                min={today}
                required
                defaultValue={today}
              />
            </Field>
            <Field label="Au plus tard le" htmlFor="latest_date">
              <Input
                id="latest_date"
                name="latest_date"
                type="date"
                min={today}
                required
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className={`${section} reveal-delay-1`}>
          <legend className="sr-only">Votre colis</legend>
          <h2 className="flex items-center gap-3 text-lg font-bold">
            <Step n={2} />
            Votre colis
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type de colis" htmlFor="category">
              <Select id="category" name="category" required defaultValue="">
                <option value="" disabled>
                  Choisir
                </option>
                {groupedCategories(CATEGORIES).map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Poids (kg)" htmlFor="weight_kg">
              <Input
                id="weight_kg"
                name="weight_kg"
                type="number"
                min={0.5}
                max={300}
                step={0.5}
                required
                defaultValue={5}
              />
            </Field>
          </div>
          <div>
            <p className="text-sm font-semibold">
              Dimensions (cm) · facultatif
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                ["length_cm", "Longueur"],
                ["width_cm", "Largeur"],
                ["height_cm", "Hauteur"],
              ].map(([n, l]) => (
                <Input
                  key={n}
                  name={n}
                  type="number"
                  min={1}
                  max={300}
                  placeholder={l}
                  aria-label={`${l} en centimètres`}
                />
              ))}
            </div>
          </div>
          <Field
            label="Contenu"
            htmlFor="description"
            hint="Soyez précis : le voyageur vérifiera le colis avant de le prendre."
          >
            <Textarea
              id="description"
              name="description"
              required
              minLength={3}
              maxLength={1000}
              placeholder="Un carton de vêtements pour enfants et deux paires de chaussures, bien emballés"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Valeur déclarée (€)"
              htmlFor="declared_value"
              hint="Facultatif"
            >
              <Input
                id="declared_value"
                name="declared_value"
                type="number"
                min={0}
                max={10000}
                step={1}
              />
            </Field>
            <Field
              label="Budget maximum (€ par kg)"
              htmlFor="max_price_per_kg"
              hint="Facultatif. On ne vous propose que les trajets moins chers."
            >
              <Input
                id="max_price_per_kg"
                name="max_price_per_kg"
                type="number"
                min={1}
                max={200}
                step={0.5}
              />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-line p-4 text-[15px] has-checked:border-brand has-checked:bg-brand-pale/50">
            <input
              type="checkbox"
              name="wants_home_delivery"
              className="mt-1 h-4 w-4 accent-brand"
            />
            <span>
              <span className="block font-semibold">
                Livraison à domicile souhaitée
              </span>
              <span className="block text-sm text-muted">
                Un livreur apporte le colis chez votre destinataire. Vous
                confirmez au moment de réserver.
              </span>
            </span>
          </label>

          <div>
            <p className="text-sm font-semibold">
              Photos du colis · jusqu&apos;à 6
            </p>
            <p className="text-sm text-muted">
              Les voyageurs répondent plus vite quand ils voient le colis.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {photos.map((p) => (
                <div
                  key={p.path}
                  className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt="Photo du colis"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos((all) => all.filter((x) => x.path !== p.path))
                    }
                    className="absolute top-1 right-1 rounded-full bg-ink/70 p-1 text-white"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-paper text-sm text-muted hover:border-brand">
                  {uploading ? (
                    <Loader2
                      className="h-6 w-6 animate-spin text-brand"
                      aria-hidden="true"
                    />
                  ) : (
                    <ImagePlus
                      className="h-6 w-6 text-brand"
                      aria-hidden="true"
                    />
                  )}
                  Ajouter
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) =>
                      e.target.files && addPhotos(e.target.files)
                    }
                  />
                </label>
              )}
            </div>
            {photoError && (
              <p className="mt-2 text-sm text-danger">{photoError}</p>
            )}
          </div>
        </fieldset>

        <div className="lg:hidden">{preview}</div>
        <FormMessage state={state} />
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={pending || uploading}
        >
          <PackageCheck className="h-5 w-5" aria-hidden="true" />
          {pending ? "Publication…" : "Publier ma demande"}
        </Button>
      </form>
      <aside
        className="reveal reveal-delay-2 hidden lg:sticky lg:top-6 lg:block"
        aria-label="Aperçu de votre demande"
      >
        {preview}
        <p className="mt-4 text-center text-sm text-muted">
          Voici ce que verront les voyageurs.
        </p>
      </aside>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      className="wide tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-signal"
      aria-hidden="true"
    >
      {n}
    </span>
  );
}
