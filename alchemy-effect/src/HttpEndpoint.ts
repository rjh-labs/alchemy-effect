import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Route from "./Route.ts";

export const Tag = <
  Name extends string,
  Routes extends readonly Route.AnyRoute[],
>(
  name: Name,
) => Context.Tag(name)<HttpEndpoint, HttpEndpoint>();

export const effect = <
  Endpoint extends AnyRoute,
  Err extends Endpoint["errors"] = never,
  Req = never,
  InitErr = never,
  InitReq = never,
>(
  route: Endpoint,
  effect: Effect.Effect<
    (
      request: InstanceType<Endpoint["input"]>,
    ) => Effect.Effect<InstanceType<Endpoint["output"]>, Err, Req>,
    InitErr,
    Req | InitReq
  >,
) => Layer.effect(route, effect); // TODO(sam): implement
