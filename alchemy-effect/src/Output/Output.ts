import * as Effect from "effect/Effect";
import type { From } from "../Capability.ts";
import { getRefMetadata, isRef, ref as stageRef, type Ref } from "../Ref.ts";
import type { Resource } from "../Resource.ts";
import {
  AllExpr,
  ExprSymbol,
  literal,
  RefExpr,
  ResourceExpr,
  type ArrayExpr,
  type Expr,
  type ObjectExpr,
} from "./Expr.ts";

// a special symbol only used at runtime to probe the Output proxy

export const isOutput = (value: any): value is Output<any> =>
  value &&
  (typeof value === "object" || typeof value === "function") &&
  ExprSymbol in value;

export const of = <R extends Resource>(
  resource: Ref<R> | R,
): Output.Of<R["attr"], From<R>> => {
  if (isRef(resource)) {
    const metadata = getRefMetadata(resource);
    return new RefExpr(
      metadata.stack,
      metadata.stage,
      metadata.resourceId,
    ) as any;
  }
  return new ResourceExpr(resource) as any;
};

export const ref = <R extends Resource<string, string, any, any>>(
  resourceId: R["id"],
  options?: {
    stage?: string;
    stack?: string;
  },
) => of(stageRef({ resourceId, ...options }));

export interface Output<A = any, Src extends Resource = any, Req = any> {
  readonly kind: string;
  readonly src: Src;
  readonly req: Req;
  apply<B>(fn: (value: A) => B): Output.Of<B, Src, Req>;
  effect<B, Req2>(
    // Outputs are not allowed to fail, so we use never for the error type
    fn: (value: A) => Effect.Effect<B, never, Req2>,
  ): Output.Of<B, Src, Req | Req2>;
}

export declare namespace Output {
  // TODO(sam): doesn't support disjunct unions very well
  export type Of<A, Src extends Resource = any, Req = never> = [
    Extract<A, object>,
  ] extends [never]
    ? Output<A, Src, Req>
    : [Extract<A, any[]>] extends [never]
      ? ObjectExpr<
          {
            [attr in keyof A]: A[attr];
          },
          Src,
          Req
        >
      : ArrayExpr<Extract<A, any[]>, Src, Req>;
}

export const interpolate = <Args extends any[]>(
  template: TemplateStringsArray,
  ...args: Args
): All<Args> extends Output<any, infer Src, infer Req>
  ? Output<string, Src, Req>
  : never =>
  all(...args.map((arg) => (isOutput(arg) ? arg : literal(arg)))).apply(
    (args) =>
      template
        .map((str, i) => str + (args[i] == null ? "" : String(args[i])))
        .join(""),
  ) as any;

export const all = <Outs extends (Output | Expr)[]>(...outs: Outs) =>
  new AllExpr(outs as any) as unknown as All<Outs>;

export type All<Outs extends (Output | Expr)[]> = number extends Outs["length"]
  ? [Outs[number]] extends [
      | Output<infer V, infer Src, infer Req>
      | Expr<infer V, infer Src, infer Req>,
    ]
    ? Output<V, Src, Req>
    : never
  : Tuple<Outs>;

export type Tuple<
  Outs extends (Output | Expr)[],
  Values extends any[] = [],
  Src extends Resource = never,
  Req = never,
> = Outs extends [infer H, ...infer Tail extends (Output | Expr)[]]
  ? H extends Output<infer V, infer Src2, infer Req2>
    ? Tuple<Tail, [...Values, V], Src | Src2, Req | Req2>
    : never
  : Output<Values, Src, Req>;

export const filter = <Outs extends any[]>(...outs: Outs) =>
  outs.filter(isOutput) as unknown as Filter<Outs>;

export type Filter<Outs extends any[]> = number extends Outs["length"]
  ? Output<
      Extract<Outs[number], Output>["value"],
      Extract<Outs[number], Output>["src"],
      Extract<Outs[number], Output>["req"]
    >
  : FilterTuple<Outs>;

export type FilterTuple<
  Outs extends (Output | Expr)[],
  Values extends any[] = [],
  Src extends Resource = never,
> = Outs extends [infer H, ...infer Tail extends (Output | Expr)[]]
  ? H extends Output<infer V, infer Src2>
    ? FilterTuple<Tail, [...Values, V], Src | Src2>
    : FilterTuple<Tail, Values, Src>
  : Output<Values, Src>;
