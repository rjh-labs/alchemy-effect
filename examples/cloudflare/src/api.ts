import { $ } from "alchemy-effect";
import * as Assets from "alchemy-effect/cloudflare/assets";
import * as Worker from "alchemy-effect/cloudflare/worker";
import * as Effect from "effect/Effect";

export class WorkerAssets extends Assets.Assets("WorkerAssets", {
  directory: "./assets",
}) {}

export class Api extends Worker.serve("Api", {
  fetch: Effect.fn(function* (request) {
    yield* Effect.log(request);
    return new Response(JSON.stringify(null)) as unknown as Worker.Response;
  }),
})({
  main: import.meta.filename,
  bindings: $(Assets.Read(WorkerAssets)),
  compatibility: {
    flags: ["node_compat"],
    date: "2025-11-04",
  },
}) {}

export default Api.handler.pipe(Assets.clientFromEnv(), Worker.toHandler);
