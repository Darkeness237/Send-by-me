"use client";

import { useEffect } from "react";

// Messages d'erreur sous les champs, pour tous les formulaires du site :
// à la sortie d'un champ mal rempli, puis pour chaque champ manquant à l'envoi (au lieu de la seule bulle du navigateur).

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isControl = (el: EventTarget | null): el is Control =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

function message(el: Control, en: boolean) {
  const v = el.validity;
  const type = el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase();
  const fr = !en;
  if (v.valueMissing) {
    if (type === "checkbox") return fr ? "Cochez cette case pour continuer." : "Tick this box to continue.";
    if (type === "radio" || type === "select") return fr ? "Choisissez une option." : "Choose an option.";
    if (type === "file") return fr ? "Ajoutez un fichier." : "Add a file.";
    return fr ? "Ce champ est obligatoire." : "This field is required.";
  }
  if (v.typeMismatch) {
    if (type === "email") return fr ? "Adresse e-mail invalide (exemple : nom@exemple.com)." : "Invalid e-mail address (e.g. name@example.com).";
    if (type === "url") return fr ? "Adresse web invalide." : "Invalid web address.";
  }
  if (v.badInput) return fr ? "Valeur invalide." : "Invalid value.";
  if (v.tooShort && "minLength" in el) return fr ? `Au moins ${el.minLength} caractères.` : `At least ${el.minLength} characters.`;
  if (v.tooLong && "maxLength" in el) return fr ? `${el.maxLength} caractères maximum.` : `${el.maxLength} characters maximum.`;
  if (v.rangeUnderflow && el instanceof HTMLInputElement) return fr ? `Minimum : ${el.min}.` : `Minimum: ${el.min}.`;
  if (v.rangeOverflow && el instanceof HTMLInputElement) return fr ? `Maximum : ${el.max}.` : `Maximum: ${el.max}.`;
  if (v.stepMismatch) return fr ? "Valeur non autorisée (vérifiez les décimales)." : "Value not allowed (check decimals).";
  if (v.patternMismatch) return el.title || (fr ? "Format incorrect." : "Wrong format.");
  return el.validationMessage;
}

/** Où afficher le message : sous le bloc du champ (Field), du groupe d'options, ou juste après la case à cocher. */
function place(el: Control): { box: HTMLElement; after: boolean } {
  if (el instanceof HTMLInputElement && el.type === "radio") return { box: (el.closest("fieldset") as HTMLElement) ?? el.parentElement!, after: false };
  const field = el.closest(".field") as HTMLElement | null;
  if (field) return { box: field, after: false };
  const label = el.closest("label") as HTMLElement | null;
  if (label) return { box: label, after: true }; // case à cocher dans son libellé : message sous la ligne
  return { box: el, after: true };
}

const errorIdOf = (el: Control) => `${el.name || el.id || "champ"}-erreur`.replace(/[^\w-]/g, "");

function existing(el: Control) {
  const { box, after } = place(el);
  const id = errorIdOf(el);
  if (after) {
    const next = box.nextElementSibling;
    return next instanceof HTMLParagraphElement && next.dataset.for === id ? next : null;
  }
  return box.querySelector<HTMLParagraphElement>(`:scope > .field-error[data-for="${id}"]`);
}

function show(el: Control, en: boolean) {
  let p = existing(el);
  const id = errorIdOf(el);
  if (!p) {
    p = document.createElement("p");
    p.className = "field-error";
    p.dataset.for = id;
    p.id = id;
    p.setAttribute("role", "alert");
    const { box, after } = place(el);
    if (after) box.after(p);
    else box.appendChild(p);
  }
  p.textContent = message(el, en);
  el.setAttribute("aria-invalid", "true");
  el.setAttribute("aria-describedby", id);
}

function clear(el: Control) {
  existing(el)?.remove();
  if (el instanceof HTMLInputElement && el.type === "radio" && el.form) {
    el.form.querySelectorAll(`input[name="${CSS.escape(el.name)}"]`).forEach((r) => r.removeAttribute("aria-invalid"));
  }
  el.removeAttribute("aria-invalid");
}

export function FormValidation() {
  useEffect(() => {
    const en = document.documentElement.lang === "en";
    let firstInvalidAt = 0;

    // Envoi bloqué par le navigateur : un événement « invalid » par champ fautif.
    const onInvalid = (e: Event) => {
      if (!isControl(e.target)) return;
      e.preventDefault(); // remplace la bulle du navigateur par nos messages
      show(e.target, en);
      const now = e.timeStamp;
      if (now - firstInvalidAt > 300) {
        firstInvalidAt = now;
        e.target.focus({ preventScroll: true });
        e.target.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    // Sortie d'un champ déjà rempli (ou déjà signalé) : on vérifie tout de suite.
    const onBlur = (e: Event) => {
      const el = e.target;
      if (!isControl(el) || !el.form || el.type === "hidden") return;
      const touched = el.value !== "" || el.getAttribute("aria-invalid") === "true";
      if (!touched) return;
      if (el.validity.valid) clear(el);
      else show(el, en);
    };
    // Pendant la saisie : le message disparaît dès que le champ devient correct.
    const onInput = (e: Event) => {
      const el = e.target;
      if (!isControl(el) || el.getAttribute("aria-invalid") !== "true") return;
      if (el.validity.valid) clear(el);
      else show(el, en);
    };

    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("focusout", onBlur, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("focusout", onBlur, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, []);
  return null;
}
