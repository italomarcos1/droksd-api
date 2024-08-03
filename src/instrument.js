import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from "./env"

Sentry.init({
  dsn: env.SENTRY_CLIENT_URL,
  integrations: [
    nodeProfilingIntegration(),
    Sentry.prismaIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});
