import { bench } from "@ark/attest";
import { $ } from "@/index";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import * as Alchemy from "alchemy-effect";
import * as AWS from "alchemy-effect/aws";
import * as CLI from "alchemy-effect/cli";
import { Layer, Logger } from "effect";
import * as Effect from "effect/Effect";
import * as Lambda from "@/aws/lambda";

// Combinatorial template literals often result in expensive types- let's benchmark this one!
type makeComplexType<s extends string> = s extends `${infer head}${infer tail}`
  ? head | tail | makeComplexType<tail>
  : s;

bench("bench type", () => {
  class Api extends Lambda.serve("Api", {
    fetch: Effect.fn(function* (event) {
      return {
        body: JSON.stringify({ message: "Hello, world!" }),
      };
    }),
  })({
    main: import.meta.filename,
    bindings: $(),
  }) {}

  // select your underlying platform
  const platform = Layer.mergeAll(
    NodeContext.layer,
    FetchHttpClient.layer,
    Logger.pretty,
  );

  // select your providers
  const providers = Layer.mergeAll(AWS.live);

  // override alchemy state store, CLI/reporting and dotAlchemy
  const alchemy = Layer.mergeAll(
    Alchemy.State.localFs,
    CLI.layer,
    // optional
    Alchemy.dotAlchemy,
  );

  // define your app
  const app = Alchemy.app({ name: "my-app", stage: "dev" });

  const layers = Layer.provideMerge(
    Layer.provideMerge(providers, alchemy),
    Layer.mergeAll(platform, app),
  );

  function _() {
    Alchemy.apply({
      phase: process.argv.includes("--destroy") ? "destroy" : "update",
      resources: [Api, Consumer],
    }).pipe(
      Effect.provide(layers),
      Effect.tap((stack) =>
        Effect.log({
          url: stack?.Consumer.functionUrl,
          queueUrl: stack?.Messages.queueUrl,
        }),
      ),
      Effect.runPromiseExit,
    );
  }

  // This is an inline snapshot that will be populated or compared when you run the file
}).types([169, "instantiations"]);

// bench(
//   "bench runtime and type",
//   () => {
//     return {} as makeComplexType<"antidisestablishmentarianism">;
//   },
//   {},
// )
//   // Average time it takes the function execute
//   .mean([2, "ms"])
//   // Seems like our type is O(n) with respect to the length of the input- not bad!
//   .types([337, "instantiations"]);
