import type * as cf from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import { CloudflareEnv } from "../env";
import type * as KV from "./kv-namespace.ts";

const fromEnv = Effect.fn(function* <Key extends string = string>(
  namespace: KV.KVNamespace,
) {
  const env = yield* CloudflareEnv.getOrDie;
  return env[namespace.id] as cf.KVNamespace<Key>;
});

export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options?: Partial<cf.KVNamespaceGetOptions<undefined>>,
): Effect.Effect<string | null>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "text",
): Effect.Effect<string | null>;
export function get<ExpectedValue = unknown, Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "json",
): Effect.Effect<ExpectedValue | null>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "arrayBuffer",
): Effect.Effect<ArrayBuffer | null>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "stream",
): Effect.Effect<ReadableStream | null>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"text">,
): Effect.Effect<string | null>;
export function get<ExpectedValue = unknown, Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"json">,
): Effect.Effect<ExpectedValue | null>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"arrayBuffer">,
): Effect.Effect<ArrayBuffer | null>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"stream">,
): Effect.Effect<ReadableStream | null>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  type: "text",
): Effect.Effect<Map<string, string | null>>;
export function get<ExpectedValue = unknown, Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  type: "json",
): Effect.Effect<Map<string, ExpectedValue | null>>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  options?: Partial<cf.KVNamespaceGetOptions<undefined>>,
): Effect.Effect<Map<string, string | null>>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  options: cf.KVNamespaceGetOptions<"text">,
): Effect.Effect<Map<string, string | null>>;
export function get<ExpectedValue = unknown, Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  options: cf.KVNamespaceGetOptions<"json">,
): Effect.Effect<Map<string, ExpectedValue | null>>;
export function get<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: any,
  optOrType?: any,
): any {
  return Effect.gen(function* () {
    const client = yield* fromEnv<Key>(namespace);
    return yield* Effect.promise(() => client.get(key, optOrType));
  });
}

export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options?: Partial<cf.KVNamespaceGetOptions<undefined>>,
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<string, Metadata>>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "text",
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<string, Metadata>>;
export function getWithMetadata<
  ExpectedValue = unknown,
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "json",
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<ExpectedValue, Metadata>>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "arrayBuffer",
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<ArrayBuffer, Metadata>>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  type: "stream",
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<ReadableStream, Metadata>>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"text">,
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<string, Metadata>>;
export function getWithMetadata<
  ExpectedValue = unknown,
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"json">,
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<ExpectedValue, Metadata>>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"arrayBuffer">,
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<ArrayBuffer, Metadata>>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  options: cf.KVNamespaceGetOptions<"stream">,
): Effect.Effect<cf.KVNamespaceGetWithMetadataResult<ReadableStream, Metadata>>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  type: "text",
): Effect.Effect<
  Map<string, cf.KVNamespaceGetWithMetadataResult<string, Metadata>>
>;
export function getWithMetadata<
  ExpectedValue = unknown,
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  type: "json",
): Effect.Effect<
  Map<string, cf.KVNamespaceGetWithMetadataResult<ExpectedValue, Metadata>>
>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  options?: Partial<cf.KVNamespaceGetOptions<undefined>>,
): Effect.Effect<
  Map<string, cf.KVNamespaceGetWithMetadataResult<string, Metadata>>
>;
export function getWithMetadata<
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  options: cf.KVNamespaceGetOptions<"text">,
): Effect.Effect<
  Map<string, cf.KVNamespaceGetWithMetadataResult<string, Metadata>>
>;
export function getWithMetadata<
  ExpectedValue = unknown,
  Metadata = unknown,
  Key extends string = string,
>(
  namespace: KV.KVNamespace<Key>,
  key: Array<Key>,
  options: cf.KVNamespaceGetOptions<"json">,
): Effect.Effect<
  Map<string, cf.KVNamespaceGetWithMetadataResult<ExpectedValue, Metadata>>
>;
export function getWithMetadata(
  namespace: KV.KVNamespace<any>,
  key: any,
  optOrType?: any,
): any {
  return Effect.gen(function* () {
    const client = yield* fromEnv(namespace);
    return yield* Effect.promise(() => client.getWithMetadata(key, optOrType));
  });
}
export function put<Key extends string = string>(
  namespace: KV.KVNamespace<Key>,
  key: Key,
  value: string | ArrayBuffer | ArrayBufferView | cf.ReadableStream,
  options?: cf.KVNamespacePutOptions,
): Effect.Effect<void> {
  return Effect.gen(function* () {
    const client = yield* fromEnv<Key>(namespace);
    return yield* Effect.promise(() => client.put(key, value, options));
  });
}
export function list<Metadata = unknown, Key extends string = string>(
  namespace: KV.KVNamespace,
  options?: cf.KVNamespaceListOptions,
): Effect.Effect<cf.KVNamespaceListResult<Metadata, Key>> {
  return Effect.gen(function* () {
    const client = yield* fromEnv<Key>(namespace);
    return yield* Effect.promise(() => client.list<Metadata>(options));
  });
}
export function del<Key extends string = string>(
  namespace: KV.KVNamespace,
  key: Key,
): Effect.Effect<void> {
  return Effect.gen(function* () {
    const client = yield* fromEnv<Key>(namespace);
    return yield* Effect.promise(() => client.delete(key));
  });
}
