import type { AnyResource, Resource } from "../Resource.ts";
import { isPrimitive } from "../internal/util/data.ts";
import type { IsAny, UnionToIntersection } from "../internal/util/types.ts";
import {
  isAllExpr,
  isApplyExpr,
  isEffectExpr,
  isExpr,
  isPropExpr,
  isResourceExpr,
} from "./Expr.ts";
import { isOutput, type Output } from "./Output.ts";

export type Upstream<O extends Output<any, any, any>> =
  O extends Output<infer _V, infer Up, infer _Req>
    ? {
        [Id in Up["id"]]: Extract<Up, { id: Id }>;
      }
    : never;

export const hasOutputs = (value: any): value is Output<any, any, any> =>
  Object.keys(upstreamAny(value)).length > 0;

export const upstreamAny = (
  value: any,
): {
  [ID in string]: Resource;
} => {
  if (isExpr(value)) {
    return upstream(value);
  } else if (Array.isArray(value)) {
    return Object.assign({}, ...value.map(resolveUpstream));
  } else if (
    value &&
    (typeof value === "object" || typeof value === "function")
  ) {
    return Object.assign(
      {},
      ...Object.values(value).map((value) => resolveUpstream(value)),
    );
  }
  return {};
};

export const upstream = <E extends Output<any, AnyResource, any>>(
  expr: E,
): {
  [Id in keyof Upstream<E>]: Upstream<E>[Id];
} => _upstream(expr);

const _upstream = (expr: any): any => {
  if (isResourceExpr(expr)) {
    return {
      [expr.src.id]: expr.src,
    };
  } else if (isPropExpr(expr)) {
    return upstream(expr.expr);
  } else if (isAllExpr(expr)) {
    return Object.assign({}, ...expr.outs.map((out) => upstream(out)));
  } else if (isEffectExpr(expr) || isApplyExpr(expr)) {
    return upstream(expr.expr);
  } else if (Array.isArray(expr)) {
    return expr.map(_upstream).reduce(toObject, {});
  } else if (typeof expr === "object" && expr !== null) {
    return Object.values(expr)
      .map((v) => _upstream(v))
      .reduce(toObject, {});
  }
  return {};
};

export type ResolveUpstream<A> = unknown extends A
  ? { [id: string]: Resource }
  : A extends undefined | null | boolean | number | string | symbol | bigint
    ? {}
    : IsAny<A> extends true
      ? {}
      : A extends Output<any, infer Upstream, any>
        ? {
            [Id in Upstream["id"]]: Extract<Upstream, { id: Id }>;
          }
        : A extends readonly any[] | any[]
          ? ResolveUpstream<A[number]>
          : A extends Record<string, any>
            ? {
                [Id in keyof UnionToIntersection<
                  ResolveUpstream<A[keyof A]>
                >]: UnionToIntersection<ResolveUpstream<A[keyof A]>>[Id];
              }
            : {};

export const resolveUpstream = <const A>(value: A): ResolveUpstream<A> => {
  if (isPrimitive(value)) {
    return {} as any;
  } else if (isOutput(value)) {
    return upstream(value) as any;
  } else if (Array.isArray(value)) {
    return Object.fromEntries(
      value.map((v) => resolveUpstream(v)).flatMap(Object.entries),
    ) as any;
  } else if (typeof value === "object" || typeof value === "function") {
    return Object.fromEntries(
      Object.values(value as any)
        .map(resolveUpstream)
        .flatMap(Object.entries),
    ) as any;
  }
  return {} as any;
};

const toObject = <A, B>(acc: B, v: A) => ({
  ...acc,
  ...v,
});
