// Suivi des erreurs dans le navigateur (Sentry). Pas de Session Replay : aucune capture d'écran ni d'interaction.
import * as Sentry from "@sentry/nextjs";
import { sentryBase } from "@/lib/sentry-scrub";

Sentry.init({ ...sentryBase });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
