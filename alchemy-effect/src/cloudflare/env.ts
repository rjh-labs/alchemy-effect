import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

export class CloudflareEnv extends Context.Tag("CloudflareEnv")<
  CloudflareEnv,
  Record<string, unknown>
>() {
  static readonly getOrDie = Effect.gen(function* () {
    const env = yield* Effect.serviceOption(CloudflareEnv).pipe(
      Effect.map(Option.getOrUndefined),
    );
    if (!env) {
      return yield* Effect.die("CloudflareEnv is not available");
    }
    return env;
  });
}
