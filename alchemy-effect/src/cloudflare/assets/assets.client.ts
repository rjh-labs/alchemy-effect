import type { Fetcher } from "@cloudflare/workers-types";
import { Context, Effect, Layer, Option } from "effect";
import { CloudflareEnv } from "../env.ts";

export class AssetsClient extends Context.Tag("Cloudflare.Assets.Client")<
  AssetsClient,
  Fetcher
>() {}

export const client = () =>
  Layer.effect(
    AssetsClient,
    Effect.gen(function* () {
      const env = yield* Effect.serviceOption(CloudflareEnv).pipe(
        Effect.map(Option.getOrUndefined),
      );
      if (!env) {
        return yield* Effect.die("CloudflareEnv is not available");
      }
      return env.ASSETS as Fetcher;
    }),
  );

export const clientFromEnv = () => Effect.provide(client());
