import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { Instance } from "../Util/instance.ts";
import type { EndpointClass } from "./Endpoint.ts";

export const make = <E extends EndpointClass>(
  endpoint: E,
): Layer.Layer<Instance<E>> =>
  Layer.effect(
    endpoint as any as Context.Tag<Instance<E>, any>,
    Effect.gen(function* () {
      return {
        // TODO
      };
    }),
  );
