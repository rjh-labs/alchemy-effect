import { $ } from "alchemy-effect";
import * as KVNamespace from "alchemy-effect/cloudflare/kv-namespace";
import * as Worker from "alchemy-effect/cloudflare/worker";
import * as Effect from "effect/Effect";

export class MyKV extends KVNamespace.KVNamespace("MyKV", {}) {}

export class Api extends Worker.serve("Api", {
  fetch: Effect.fn(function* (request) {
    const value = yield* KVNamespace.get(MyKV, "test");
    return new Response(JSON.stringify(value));
  }),
})({
  main: import.meta.filename,
  bindings: $(KVNamespace.Bind(MyKV)),
  compatibility: {
    flags: ["node_compat"],
    date: "2025-11-04",
  },
}) {}

export default Api.handler.pipe(Worker.toHandler);
