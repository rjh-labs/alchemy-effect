import type { KVNamespace } from "@cloudflare/workers-types";
import { Option } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { CloudflareEnv } from "../env";

export class KVNamespaceClient extends Context.Tag(
  "Cloudflare.KVNamespace.Client",
)<KVNamespaceClient, KVNamespace>() {}

export const client = () =>
  Layer.effect(
    KVNamespaceClient,
    Effect.gen(function* () {
      // TODO: provide effect-native interface
      // TODO: use policy.declare
      // TODO: provide node client as well?
      const env = yield* Effect.serviceOption(CloudflareEnv).pipe(
        Effect.map(Option.getOrUndefined),
      );
      if (!env) {
        console.error("CloudflareEnv is not available");
        return yield* Effect.die("CloudflareEnv is not available");
      }
      return env["<todo>"] as KVNamespace;
    }),
  );
