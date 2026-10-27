"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Soumet un formulaire à une action sans le vider : React réinitialise les champs après une action
 * de formulaire, ce qui ferait perdre la saisie quand le serveur renvoie une erreur.
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(formData));
  };
}
