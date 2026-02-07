import type * as runtime from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { declare, type To } from "../../../Capability.ts";
import { getCloudflareEnvKey } from "../../context.ts";
import { replaceEffectStream } from "../../stream.ts";
import type * as KV from "../Namespace.ts";
import type { Bind } from "../Namespace.ts";

export const put = Effect.fnUntraced(function* <KV extends KV.Namespace>(
  namespace: KV,
  key: string,
  value:
    | string
    | ArrayBuffer
    | ArrayBufferView
    | runtime.ReadableStream
    | Stream.Stream<any>,
  options?: runtime.KVNamespacePutOptions,
) {
  yield* declare<Bind<To<KV>>>();
  const client = yield* getCloudflareEnvKey<runtime.KVNamespace>(namespace.id);
  return yield* Effect.promise(() =>
    client.put(key, replaceEffectStream(value), options),
  );
});
