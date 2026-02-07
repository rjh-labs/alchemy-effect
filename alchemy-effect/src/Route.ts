import type * as Effect from "effect/Effect";
import type { Pipeable } from "effect/Pipeable";
import type { AnyClass } from "./Schema.ts";
import type { Traits } from "./internal/router/index.ts";

export type AnyRoute = Route<string, AnyClass, AnyClass, any, any, any>;

export interface Route<
  Name extends string = string,
  Input extends AnyClass = AnyClass,
  Output extends AnyClass = AnyClass,
  Err = never,
  MidlewareReq = never,
  GlobalReq = never,
> extends Pipeable {
  type: "route";
  name: Name;
  input: Input;
  output: Output;
  handler: (
    request: InstanceType<Input>,
  ) => Effect.Effect<InstanceType<Output>, Err, GlobalReq | MidlewareReq>;
}

export interface RouteProps<
  Input extends AnyClass,
  Output extends AnyClass,
  Err,
  Req,
> {
  input: Input;
  output: Output;
  handler: (
    request: NoInfer<InstanceType<Input>>,
  ) => Effect.Effect<NoInfer<InstanceType<Output>>, Err, Req>;
}

export declare const Route: <
  Name extends string,
  Input extends AnyClass,
  Output extends AnyClass,
  Err,
  Req,
>(
  name: Name,
  props: RouteProps<Input, Output, Err, Req>,
) => Route<
  Name,
  Input,
  Output,
  Err,
  Context<Input> | Context<Output>,
  Exclude<Req, Context<Input> | Context<Output>>
>;

type Context<C> = Traits.Of<C>["Req"];
