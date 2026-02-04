import * as Effect from "effect/Effect";
import type * as Route from "./route.ts";

export const make = <const Routes extends readonly Route.AnyRoute[]>(
  ...routes: Routes
) =>
  Effect.gen(function* () {
    // for (const route of routes) {
    //   yield* route.handler(route.input);
    // }
  });
