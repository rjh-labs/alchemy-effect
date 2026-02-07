import type * as runtime from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import { declare, type To } from "../../../Capability.ts";
import { getCloudflareEnvKey } from "../../context.ts";
import type * as KV from "../Namespace.ts";
import type { Bind } from "../Namespace.ts";

export const get = Effect.fnUntraced(function* <KV extends KV.Namespace>(
  namespace: KV,
  key: string,
) {
  yield* declare<Bind<To<KV>>>();
  const client = yield* getCloudflareEnvKey<runtime.KVNamespace>(namespace.id);
  return yield* Effect.promise(() => client.get(key));
});
