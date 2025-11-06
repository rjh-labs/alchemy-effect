import { FetchHttpClient } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import * as Alchemy from "alchemy-effect";
import * as CLI from "alchemy-effect/cli";
import * as Cloudflare from "alchemy-effect/cloudflare";
import * as Effect from "effect/Effect";
import { Api } from "./src/api.ts";

const plan = Alchemy.plan({
  phase: process.argv.includes("--destroy") ? "destroy" : "update",
  services: [Api],
});

const stack = await plan.pipe(
  // Effect.tap((plan) => Console.log(plan)),
  Alchemy.apply,
  Effect.provide(CLI.layer),
  Effect.provide(Cloudflare.live),
  Effect.provide(Alchemy.State.localFs),
  Effect.provide(Alchemy.dotAlchemy),
  Effect.provide(Alchemy.app({ name: "my-app-11", stage: "john" })),
  Effect.provide(NodeContext.layer),
  Effect.provide(FetchHttpClient.layer),
  Effect.tap((stack) => Effect.log(stack?.Api.id)),
  Effect.runPromise,
);

if (stack) {
  console.log(stack.Api.id);
}
