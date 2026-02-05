import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import * as R2 from "alchemy-effect/cloudflare/r2";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import { Bindings } from "../../binding.ts";
import { Worker } from "../../cloudflare/index.ts";
import * as Alchemy from "../../index.ts";
import { ServiceTag } from "../../index.ts";
import { effect, func } from "../../schema.ts";
import { Chat } from "./service.ts";

export class FilesBucket extends R2.Bucket("Files") {}
export class FilesBucket2 extends R2.Bucket("Files2") {}

export class ContextA extends Context.Tag("ContextA")<ContextA, string>() {}

export const localChat = Chat.layer.effect(
  Effect.gen(function* () {
    yield* R2.get(FilesBucket, "test");
    const a = yield* ContextA;
    const _ = {
      getThread: Effect.fnUntraced(function* (input) {
        return undefined!;
      }),
      createThread: Effect.fnUntraced(function* (input) {
        return undefined!;
      }),
      listThreads: Effect.fnUntraced(function* (input) {
        return undefined!;
      }),
    };
    return _;
  }),
);

export class BackendNoSchema extends ServiceTag("BackendNoSchema")<
  BackendNoSchema,
  {
    get: (key: string) => Effect.Effect<string, never, any>;
    put: (key: string, value: string) => Effect.Effect<void, never, any>;
  }
>() {}

export class Backend extends ServiceTag("Backend")<Backend>()({
  get: func(S.String, effect(S.String))`
    Get a value from the backend.
    If it does not exist, use ${() => Backend.put} to create it.`,
  put: func([S.String, S.String], effect(S.Void))`
    Put a value into the backend.
    Retrieve it with ${() => Backend.get}.`,
}) {}

// implement the Backend service with Cloudflare
class Storage extends R2.Bucket("Storage") {}

const cloudflareBackend = Backend.layer.succeed({
  get: (key) => R2.get(Storage, key).pipe(Effect.map((_body) => "")),
  put: (key, value) => R2.put(Storage, key, value),
});

// define a cloud-agnostic Service
export class GroupService extends Alchemy.serve("GroupService", {
  fetch: Effect.fnUntraced(function* (request) {
    // interact with the Backend service
    const object = yield* Backend.get((yield* request.json) as string);
    return yield* HttpServerResponse.json(object);
  }),
}) {}

// host the GroupService in a Cloudflare Worker
export default GroupService.pipe(
  Alchemy.provide(cloudflareBackend),
  // Choose where to host this service (CF Worker)
  Worker.serve({
    main: import.meta.filename,
    cpuMus: 60_000,
  }),
  (a) => a,
  // Provide Infrastructure Bindings
  Bindings.provide(R2.Bind(Storage)),
);
