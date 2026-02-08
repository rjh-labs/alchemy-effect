import type * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { Pipeable } from "effect/Pipeable";
import type { AnyClass } from "./Schema.ts";

export type AnyRoute = Route<string, AnyClass, AnyClass, AnyClass>;

// TODO(sam): rename to Operation?
export interface Route<
  Name extends string = string,
  Input extends AnyClass = AnyClass,
  Output extends AnyClass = AnyClass,
  Err extends AnyClass = never,
> extends Pipeable {
  type: "route";
  name: Name;
  input: Input;
  output: Output;
  errors: Err[];
  new (): Route<Name, Input, Output, Err>;
  // handler: (
  //   request: InstanceType<Input>,
  // ) => Effect.Effect<InstanceType<Output>, Err, GlobalReq | MidlewareReq>;
}

export interface RouteProps<
  Input extends AnyClass,
  Output extends AnyClass,
  Err extends AnyClass,
> {
  input: Input;
  output: Output;
  errors: Err[];
}

export declare const Route: <
  Name extends string,
  Input extends AnyClass,
  Output extends AnyClass,
  Err extends AnyClass = never,
>(
  name: Name,
  props: RouteProps<Input, Output, Err>,
) => Route<Name, Input, Output, Err>;

export const Tag = Route;

export const effect = <
  R extends AnyRoute,
  Err extends R["errors"] = never,
  Req = never,
  InitErr = never,
  InitReq = never,
>(
  route: R,
  effect: Effect.Effect<
    (
      request: InstanceType<R["input"]>,
    ) => Effect.Effect<InstanceType<R["output"]>, Err, Req>,
    InitErr,
    Req | InitReq
  >,
) => Layer.effect(route, effect); // TODO(sam): implement
