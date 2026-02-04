import * as Effect from "effect/Effect";
import { $ } from "../../$.ts";
import { Worker } from "../../cloudflare/index.ts";
import { Chat } from "./service.ts";

export const localChat = Chat.layer.effect(
  Effect.gen(function* () {
    return Chat.make({
      getThread: Effect.fnUntraced(function* (input) {}),
      createThread: Effect.fnUntraced(function* (input) {}),
      listThreads: Effect.fnUntraced(function* (input) {}),
    });
  }),
);

export class GroupService extends Worker.serve("GroupService", {
  fetch: Effect.fnUntraced(function* (request) {
    return new Response("Hello from GroupService");
  }),
})({
  main: import.meta.filename,
  bindings: $(),
  bindings2: Effect.provide(localChat),
}) {}

export const groupService = GroupService.handler.pipe(
  Effect.provide(localChat),
);
