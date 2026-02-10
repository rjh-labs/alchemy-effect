import * as Effect from "effect/Effect";
import type * as AWS from "../index.ts";

import type { Capability } from "../../Capability.ts";
import { Runtime, type RuntimeProps } from "../../Runtime.ts";

import type { HttpClient } from "@effect/platform/HttpClient";
import type { Credentials } from "distilled-aws/Credentials";
import type { Region } from "distilled-aws/Region";
import type { AnyBinding } from "../../Binding.ts";
import type { Unbound } from "../../SLayer.ts";
import * as IAM from "../IAM/index.ts";

export interface FunctionProps<Req = unknown> extends RuntimeProps<
  Function,
  Req
> {
  functionName?: string;
  functionArn?: string;
  main: string;
  handler?: string;
  memory?: number;
  runtime?: "nodejs20.x" | "nodejs22.x";
  architecture?: "x86_64" | "arm64";
  url?: boolean;
}
export declare namespace FunctionProps {
  export type Simplified<Req> = FunctionProps<
    Capability.Simplify<Extract<Req, Capability>>
  >;
}

export type FunctionAttr<Props extends FunctionProps = FunctionProps> = {
  functionArn: string;
  functionName: string;
  functionUrl: Props["url"] extends true ? string : undefined;
  roleName: string;
  roleArn: string;
  code: {
    hash: string;
  };
};

export interface FunctionBinding {
  env?: {
    [key: string]: string;
  };
  policyStatements?: IAM.PolicyStatement[];
}

export interface Function extends Runtime<"AWS.Lambda.Function"> {
  props: FunctionProps<any>;
  attr: FunctionAttr<Extract<this["props"], FunctionProps<any>>>;
  binding: FunctionBinding;
  base: Function;
}
export const Function = Runtime("AWS.Lambda.Function")<Function>();

export const bind =
  <Bindings extends AnyBinding<Function>[]>(...bindings: Bindings) =>
  <Err = never>(
    unbound: Unbound<
      (event: any, ctx: AWS.Lambda.Context) => Promise<any>,
      Err,
      Bindings[number]["capability"]
    >,
  ) =>
    undefined;

export const make =
  (props: FunctionProps) =>
  <A, Err, Req extends Capability | Region | HttpClient | Credentials>(
    eff: Effect.Effect<A, Err, Req>,
  ): Unbound<
    (event: any, ctx: AWS.Lambda.Context) => Promise<any>,
    Err,
    Extract<Req, Capability>
  > =>
    // @ts-expect-error - TODO
    Effect.gen(function* () {
      // loop through Context and identify entrypoints?
      // YUCK: would prefer it to be a general solution instead of hard-coded here
      const context = yield* Effect.context<never>();

      const func = Effect.fn(function* (
        event: any,
        context: AWS.Lambda.Context,
      ) {
        // identify services we have in this function and route requests to them
        for (const handler of interceptors) {
          if (handler.canHandle(event)) {
            return handler.handle(event);
          }
        }
      });

      for (const serviceTag of funcTag.services) {
        // this gets us the implementation but does not help us route
        const service = yield* RequestInterceptorLayer(serviceTag);
      }

      // Interceptor[]

      // export default ...
      return async (event: any, ctx: AWS.Lambda.Context) =>
        Effect.runPromise(func(event, ctx).pipe(Effect.provide(context)));
    });
