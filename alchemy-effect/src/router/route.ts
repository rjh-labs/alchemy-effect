import type * as Effect from "effect/Effect";
import type { AnyClass } from "../schema.ts";
import type { Traits } from "./index.ts";

export type AnyRoute = Route<string, AnyClass, AnyClass, any, any, any>;

export type Route<
  Name extends string = string,
  Input extends AnyClass = AnyClass,
  Output extends AnyClass = AnyClass,
  Err = never,
  MidlewareReq = never,
  GlobalReq = never,
> = {
  type: "route";
  name: Name;
  input: Input;
  output: Output;
  handler: (
    request: InstanceType<Input>,
  ) => Effect.Effect<InstanceType<Output>, Err, GlobalReq | MidlewareReq>;
};

export declare const Route: <
  Name extends string,
  Input extends AnyClass,
  Output extends AnyClass,
  Err,
  Req,
>(
  name: Name,
  props: {
    input: Input;
    output: Output;
    handler: (
      request: NoInfer<InstanceType<Input>>,
    ) => Effect.Effect<NoInfer<InstanceType<Output>>, Err, Req>;
  },
) => Route<
  Name,
  Input,
  Output,
  Err,
  Context<Input> | Context<Output>,
  Exclude<Req, Context<Input> | Context<Output>>
>;

type Context<C> = Traits.Of<C>["Req"];
