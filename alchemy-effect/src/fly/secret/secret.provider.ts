import * as Effect from "effect/Effect";
import { FlyApi } from "../api.ts";
import { Secret, type SecretAttr, type SecretProps } from "./secret.ts";

type FlySecretResponse = {
  name: string;
  digest: string;
  created_at: string;
};

export const secretProvider = () =>
  Secret.provider.effect(
    Effect.gen(function* () {
      const api = yield* FlyApi;

      const mapResult = <Props extends SecretProps>(
        app: string,
        key: string,
        digest: string,
      ): SecretAttr<Props> =>
        ({
          app,
          key,
          deployed: true,
          digest,
        }) as SecretAttr<Props>;

      return {
        create: Effect.fnUntraced(function* ({ news }) {
          // Set secret via API
          const response = yield* api.post<{ release: { id: string } }>(
            `/apps/${news.app}/secrets`,
            {
              [news.key]: news.value,
            },
          );

          // Calculate digest of value (simple hash for tracking)
          const digest = btoa(news.value).substring(0, 16);

          return mapResult<SecretProps>(news.app, news.key, digest);
        }),

        update: Effect.fnUntraced(function* ({ news }) {
          // Update secret (same as create for Fly.io)
          const response = yield* api.post<{ release: { id: string } }>(
            `/apps/${news.app}/secrets`,
            {
              [news.key]: news.value,
            },
          );

          const digest = btoa(news.value).substring(0, 16);

          return mapResult<SecretProps>(news.app, news.key, digest);
        }),

        delete: Effect.fnUntraced(function* ({ output }) {
          // Unset secret by setting it to empty
          yield* api
            .post(`/apps/${output.app}/secrets`, {
              [output.key]: "",
            })
            .pipe(Effect.catchTag("NotFound", () => Effect.void));
        }),

        read: Effect.fnUntraced(function* ({ output }) {
          if (!output) return undefined;

          // Fly API doesn't expose secret values, so we can't truly verify
          // Just check if the app exists
          return yield* api
            .get(`/apps/${output.app}`)
            .pipe(
              Effect.map(() => output),
              Effect.catchTag("NotFound", () => Effect.succeed(undefined)),
            );
        }),

        diff: Effect.fn(function* ({ olds, news, output }) {
          // Replace if app or key changes
          if (output.app !== news.app || output.key !== news.key) {
            return { action: "replace" };
          }

          // Update if value changes (detected by digest mismatch)
          const newDigest = btoa(news.value).substring(0, 16);
          if (output.digest !== newDigest) {
            return { action: "update" };
          }
        }),
      };
    }),
  );
