// Suivi des erreurs dans l'environnement edge (proxy).
import * as Sentry from "@sentry/nextjs";
import { sentryBase } from "@/lib/sentry-scrub";

Sentry.init({ ...sentryBase });
