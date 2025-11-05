import * as Effect from "effect/Effect";
import esbuild from "esbuild";

// wip
export const bundle = Effect.fn(function* (props: esbuild.BuildOptions) {
  const result = yield* Effect.promise(() =>
    esbuild.build({
      ...props,
    }),
  );
  return result;
});
