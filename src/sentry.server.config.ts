// Suivi des erreurs côté serveur Node.js (pages, Server Actions, routes API).
import * as Sentry from "@sentry/nextjs";
import { sentryBase } from "@/lib/sentry-scrub";

Sentry.init({ ...sentryBase });
