"use client";

import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/** Partage du lien de parrainage : copie, WhatsApp, SMS, e-mail ou partage natif du téléphone. */
export function ShareReferral({ link, code, text }: { link: string; code: string; text: string }) {
  const t = useT();
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const copy = async (value: string, what: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };
  const message = `${text} ${link}`;
  const channel = "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-semibold hover:border-ink/30";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl bg-paper p-2 pl-4">
        <span className="wide tabular flex-1 text-2xl font-extrabold tracking-[0.15em]">{code}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => copy(code, "code")}>
          {copied === "code" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied === "code" ? t("Copié") : t("Copier le code")}
        </Button>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-line p-2 pl-4">
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{link}</span>
        <Button type="button" size="sm" onClick={() => copy(link, "link")}>
          {copied === "link" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied === "link" ? t("Lien copié") : t("Copier le lien")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a className={channel} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer noopener">
          <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" />{" "}{t("WhatsApp")}
        </a>
        <a className={channel} href={`sms:?&body=${encodeURIComponent(message)}`}>
          <MessageCircle className="h-4 w-4 text-brand" aria-hidden="true" />{" "}{t("SMS")}
        </a>
        <a className={channel} href={`mailto:?subject=${encodeURIComponent("Rejoins-moi sur Send By Me")}&body=${encodeURIComponent(message)}`}>
          <Mail className="h-4 w-4 text-brand" aria-hidden="true" />{" "}{t("E-mail")}
        </a>
        <button
          type="button"
          className={channel}
          onClick={() => {
            if (navigator.share) navigator.share({ title: "Send By Me", text, url: link }).catch(() => {});
            else copy(link, "link");
          }}
        >
          <Share2 className="h-4 w-4 text-brand" aria-hidden="true" />{" "}{t("Autre")}
        </button>
      </div>
    </div>
  );
}
