import * as Context from "effect/Context";
import * as Route from "./Route.ts";

export interface HttpEndpointProps<Routes extends readonly Route.AnyRoute[]> {
  routes: Routes;
}

export const HttpEndpoint = <
  Name extends string,
  const Routes extends readonly Route.AnyRoute[],
>(
  name: Name,
  props: HttpEndpointProps<Routes>,
) => Context.Tag(name)<HttpEndpoint, HttpEndpoint>();

// export const effect = <
//   Endpoint extends Route.AnyRoute,
//   Err extends Endpoint["errors"] = never,
//   Req = never,
//   InitErr = never,
//   InitReq = never,
// >(
//   route: Endpoint,
//   effect: Effect.Effect<
//     (
//       request: InstanceType<Endpoint["input"]>,
//     ) => Effect.Effect<InstanceType<Endpoint["output"]>, Err, Req>,
//     InitErr,
//     Req | InitReq
//   >,
// ) => Layer.effect(route, effect); // TODO(sam): implement
