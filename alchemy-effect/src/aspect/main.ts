import * as Effect from "effect/Effect";
import { ChatService } from "./chat/service.ts";

const program = Effect.gen(function* () {
  const chat = yield* ChatService;
});
