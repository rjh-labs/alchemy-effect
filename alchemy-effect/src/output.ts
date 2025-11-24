import * as Effect from "effect/Effect";
import { pipe, Effectable, Utils } from "effect";
import type { Resource, AnyResource } from "./resource.ts";
import type { From } from "./policy.ts";
import { Table } from "./aws/dynamodb/table.ts";
import * as Data from "effect/Data";
import type { Pipeable } from "effect/Pipeable";
import { isPrimitive, type Primitive } from "./data.ts";
import type { Input, Inputs } from "./input.ts";
import { assertNeverOrDie } from "./assert-never.ts";

// a special symbol only used at runtime to probe the Output proxy
const ExprSymbol = Symbol.for("alchemy/Expr");

export const isOutput = (value: any): value is Output<any> =>
  value &&
  (typeof value === "object" || typeof value === "function") &&
  ExprSymbol in value;

export const of = <R extends Resource>(
  resource: R,
): Output.Of<R["attr"], From<R>> =>
  new ResourceExpr(resource) as unknown as Output.Of<R["attr"], From<R>>;

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
    ? [A] extends [string] | [string | undefined]
      ? String<Extract<A, string | undefined>, Src, Req>
      : [A] extends [number] | [number | undefined]
        ? Number<Extract<A, number | undefined>, Src, Req>
        : [A] extends [bigint] | [bigint | undefined]
          ? BigInt<Extract<A, bigint | undefined>, Src, Req>
          : Output<A, Src, Req>
    : [A] extends [(...args: infer Args) => infer Return]
      ? (...args: Args) => Output.Of<Awaited<Return>, Src, Req>
      : [Extract<A, any[]>] extends [never]
        ? Object<
            {
              [attr in keyof A]: A[attr];
            },
            Src,
            Req
          >
        : Array<Extract<A, any[]>, Src, Req>;
}

export type String<
  Val extends string | undefined = string | undefined,
  Src extends Resource = AnyResource,
  Req = never,
> = Output<Val, Src, Req> & {
  [method in keyof string]: string[method] extends (
    ...args: infer A extends any[]
  ) => infer Return
    ? <args extends Args<A>>(
        ...args: args
      ) => Output.Of<
        Return | Extract<Val, undefined>,
        Extract<args[number], Output>["src"] | Src,
        Extract<args[number], Output>["req"] | Req
      >
    : never;
};

export type Number<
  Val extends number | undefined = number | undefined,
  Src extends Resource = AnyResource,
  Req = never,
> = Output<Val, Src, Req> & {
  [method in keyof number]: number[method] extends (
    ...args: infer A extends any[]
  ) => infer Return
    ? <args extends Args<A>>(
        ...args: args
      ) => Output.Of<
        Return | Extract<Val, undefined>,
        Extract<args[number], Output>["src"] | Src,
        Extract<args[number], Output>["req"] | Req
      >
    : never;
};

export type BigInt<
  Val extends bigint | undefined = bigint | undefined,
  Src extends Resource = AnyResource,
  Req = never,
> = Output<Val, Src, Req> & {
  [method in keyof bigint]: bigint[method] extends (
    ...args: infer A extends any[]
  ) => infer Return
    ? <args extends Args<A>>(
        ...args: args
      ) => Output.Of<
        Return | Extract<Val, undefined>,
        Extract<args[number], Output>["src"] | Src,
        Extract<args[number], Output>["req"] | Req
      >
    : never;
};

type Args<T extends any[]> = T extends [infer H, ...infer Tail]
  ? [Input<H>, ...Args<Tail>]
  : [];

export type Object<A, Src extends Resource, Req = any> = Output<A, Src, Req> & {
  [Prop in keyof Exclude<A, undefined>]-?: Output.Of<
    Exclude<A, undefined>[Prop] | Extract<A, undefined>,
    Src,
    Req
  >;
};

type Sources<T> =
  T extends Output<infer A, infer Src, infer Req>
    ? Src
    : T extends Primitive
      ? never
      : T extends any[]
        ? ArraySources<T>
        : {
            [k in keyof T]: Sources<T[k]>;
          }[keyof T];

type ArraySources<T extends any[]> = T extends [infer H, ...infer Tail]
  ? [Sources<H>, ...ArraySources<Tail>]
  : [];

type Requirements<T> =
  T extends Output<infer A, infer Src, infer Req>
    ? Req
    : T extends Primitive
      ? never
      : T extends any[]
        ? ArrayRequirements<T>
        : {
            [k in keyof T]: Requirements<T[k]>;
          }[keyof T];

type ArrayRequirements<T extends any[]> = T extends [infer H, ...infer Tail]
  ? [Requirements<H>, ...ArrayRequirements<Tail>]
  : [];

export type Array<A extends any[], Src extends Resource, Req = any> = Output<
  A,
  Src,
  Req
> & {
  [i in Extract<keyof A, number>]: Output.Of<A[i], Src, Req>;
} & {
  map<B>(
    fn: (value: Output.Of<A[number], Src, Req>) => B,
  ): Array<Input.Resolve<B>[], Src | Sources<B>, Req | Requirements<B>>;
  flatMap<B>(
    fn: (value: Output.Of<A[number], Src, Req>) => B[],
  ): Array<Input.Resolve<B>[], Src | Sources<B>, Req | Requirements<B>>;
  filter<Src2 extends AnyResource = never, Req2 = never>(
    predicate: (
      value: Output.Of<A[number], Src, Req>,
    ) => Output<boolean, Src2, Req2> | boolean,
  ): Array<A, Src | Src2, Req | Req2>;
};

export const isExpr = (value: any): value is Expr<any> =>
  value && ExprSymbol in value;

export type Expr<A = any, Src extends AnyResource = AnyResource, Req = any> =
  | AllExpr<Expr<A, Src, Req>[]>
  | ApplyExpr<any, A, Src, Req>
  | CallExpr<any, A, Src, Req>
  | EffectExpr<any, A, Src, Req>
  | LiteralExpr<A>
  | MapArrayExpr<any, A, Src, Req>
  | FlatMapArrayExpr<any, A, Src, Req>
  | PropExpr<A, keyof A, Src, Req>
  | ResourceExpr<A, Src, Req>;

const proxy = (self: any): any =>
  new Proxy(
    Object.assign(() => {}, self),
    {
      has: (_, prop) => (prop === ExprSymbol ? true : prop in self),
      get: (_, prop) =>
        prop === ExprSymbol
          ? self
          : prop === "apply"
            ? self[prop]
            : self[prop as keyof typeof self]
              ? typeof self[prop as keyof typeof self] === "function" &&
                !("kind" in self)
                ? new PropExpr(self, prop as never)
                : self[prop as keyof typeof self]
              : new PropExpr(self, prop as never),
      apply: (_, thisArg, args) => {
        if (isPropExpr(self)) {
          if (self.identifier === "apply") {
            return new ApplyExpr(self.expr, args[0]);
          } else if (self.identifier === "effect") {
            return new EffectExpr(self.expr, args[0]);
          } else if (self.identifier === "map") {
            return new MapArrayExpr(self.expr, args[0]);
          } else if (self.identifier === "flatMap") {
            return new FlatMapArrayExpr(self.expr, args[0]);
          }
        }
        return new CallExpr(self, thisArg, args);
      },
    },
  );

export abstract class BaseExpr<A = any, Src extends Resource = any, Req = any>
  implements Output<A, Src, Req>
{
  declare readonly kind: any;
  declare readonly src: Src;
  declare readonly req: Req;
  // we use a kind tag instead of instanceof to protect ourselves from duplicate alchemy-effect module imports
  constructor() {}
  public apply<B>(fn: (value: A) => B): Output.Of<B, Src> {
    return new ApplyExpr(this as Expr<A, Src, Req>, fn) as any;
  }
  public effect<B, Req2>(
    fn: (value: A) => Effect.Effect<B, never, Req2>,
  ): Output.Of<B, Src, Req | Req2> {
    return new EffectExpr(this as any, fn) as any;
  }
  public pipe(...fns: any[]): any {
    // @ts-expect-error
    return pipe(this, ...fns);
  }
}

export const isResourceExpr = <
  Value = any,
  Src extends AnyResource = AnyResource,
  Req = any,
>(
  node: Expr<Value, Src, Req> | any,
): node is ResourceExpr<Value, Src, Req> => node.kind === "ResourceExpr";

export class ResourceExpr<
  Value,
  Src extends AnyResource,
  Req = never,
> extends BaseExpr<Value, Src, Req> {
  readonly kind = "ResourceExpr";
  constructor(public readonly src: Src) {
    super();
    return proxy(this);
  }
}

export const isPropExpr = <
  A = any,
  Prop extends keyof A = keyof A,
  Src extends AnyResource = AnyResource,
  Req = any,
>(
  node: any,
): node is PropExpr<A, Prop, Src, Req> => node.kind === "PropExpr";

export class PropExpr<
  A = any,
  Id extends keyof A = keyof A,
  Src extends AnyResource = AnyResource,
  Req = any,
> extends BaseExpr<A[Id], Src, Req> {
  readonly kind = "PropExpr";
  constructor(
    public readonly expr: Expr<A, Src, Req>,
    public readonly identifier: Id,
  ) {
    super();
    return proxy(this);
  }
}

export const literal = <A>(value: A) => new LiteralExpr(value);

export const isLiteralExpr = <A = any>(node: any): node is LiteralExpr<A> =>
  node.kind === "LiteralExpr";

export class LiteralExpr<A> extends BaseExpr<A, never> {
  readonly kind = "LiteralExpr";
  constructor(public readonly value: A) {
    super();
    return proxy(this);
  }
}

export const isItemExpr = <A = any>(node: any): node is ItemExpr<A> =>
  node.kind === "ItemExpr";

export class ItemExpr<A> extends BaseExpr<A, never> {
  readonly kind = "ItemExpr";
  constructor(public readonly expr: Expr<A>) {
    super();
    return proxy(this);
  }
}

export const isIndexExpr = <A = any>(node: any): node is IndexExpr<A> =>
  node.kind === "IndexExpr";

export class IndexExpr<A> extends BaseExpr<A, never> {
  readonly kind = "IndexExpr";
  constructor(
    public readonly expr: Expr<A>,
    public readonly index: Expr<number>,
  ) {
    super();
    return proxy(this);
  }
}

//Output.ApplyExpr<any, any, AnyResource, any>
export const isApplyExpr = <
  In = any,
  Out = any,
  Src extends AnyResource = AnyResource,
  Req = any,
>(
  node: Output<Out, Src, Req>,
): node is ApplyExpr<In, Out, Src, Req> => node.kind === "ApplyExpr";

export class ApplyExpr<
  A,
  B,
  Src extends AnyResource,
  Req = never,
> extends BaseExpr<B, Src, Req> {
  readonly kind = "ApplyExpr";
  constructor(
    public readonly expr: Expr<A, Src, Req>,
    public readonly f: (value: A) => B,
  ) {
    super();
    return proxy(this);
  }
}

export const isEffectExpr = <
  In = any,
  Out = any,
  Src extends AnyResource = AnyResource,
  Req = any,
  Req2 = any,
>(
  node: any,
): node is EffectExpr<In, Out, Src, Req, Req2> => node.kind === "EffectExpr";

export class EffectExpr<
  A,
  B,
  Src extends AnyResource,
  Req = never,
  Req2 = never,
> extends BaseExpr<B, Src, Req> {
  readonly kind = "EffectExpr";
  constructor(
    public readonly expr: Expr<A, Src, Req>,
    public readonly f: (value: A) => Effect.Effect<B, never, Req2>,
  ) {
    super();
    return proxy(this);
  }
}

export const isCallExpr = <
  In = any,
  Out = any,
  Src extends AnyResource = AnyResource,
  Req = any,
>(
  node: any,
): node is CallExpr<In, Out, Src, Req> => node.kind === "CallExpr";

export class CallExpr<
  A,
  B,
  Src extends AnyResource,
  Req = never,
> extends BaseExpr<B, Src, Req> {
  readonly kind = "CallExpr";
  constructor(
    public readonly expr: Expr<A, Src, Req>,
    public readonly thisType: Expr,
    public readonly args: Expr[],
  ) {
    super();
    return proxy(this);
  }
}

export const isMapArrayExpr = <
  In = any,
  Out = any,
  Src extends AnyResource = AnyResource,
  Req = any,
>(
  node: Output<Out, Src, Req>,
): node is MapArrayExpr<In, Out, Src, Req> => node.kind === "MapArrayExpr";

export class MapArrayExpr<
  A,
  B,
  Src extends AnyResource,
  Req = never,
> extends BaseExpr<B, Src, Req> {
  readonly kind = "MapArrayExpr";
  constructor(
    public readonly expr: Expr<A>,
    public readonly f: (
      item: Expr<A>,
      index: Expr<number>,
    ) => Expr<B, Src, Req> | B,
  ) {
    super();
    return proxy(this);
  }
}

export const isFlatMapArrayExpr = <
  In = any,
  Out = any,
  Src extends AnyResource = AnyResource,
  Req = any,
>(
  node: any,
): node is FlatMapArrayExpr<In, Out, Src, Req> =>
  node.kind === "FlatMapArrayExpr";

export class FlatMapArrayExpr<
  A,
  B,
  Src extends AnyResource,
  Req = never,
> extends BaseExpr<B, Src, Req> {
  readonly kind = "FlatMapArrayExpr";
  constructor(
    public readonly expr: Expr<A>,
    public readonly f: (
      item: Expr<A>,
      index: Expr<number>,
    ) => Expr<B[], Src, Req> | (B | Expr<B, Src, Req>)[],
  ) {
    super();
    return proxy(this);
  }
}
export const isAllExpr = <Outs extends Expr[] = Expr[]>(
  node: any,
): node is AllExpr<Outs> => node.kind === "AllExpr";

export class AllExpr<Outs extends Expr[]> extends BaseExpr<Outs> {
  readonly kind = "AllExpr";
  constructor(public readonly outs: Outs) {
    super();
    return proxy(this);
  }
}

export class MissingSourceError extends Data.TaggedError("MissingSourceError")<{
  message: string;
  srcId: string;
}> {}

export class UnexpectedExprError extends Data.TaggedError(
  "UnexpectedExprError",
)<{
  message: string;
  expr: Output<any, any, any>;
}> {}

export const evaluate: <A, Upstream extends AnyResource, Req>(
  expr: Output<A, Upstream, Req>,
  upstream: {
    [Id in Upstream["id"]]: Effect.Effect<
      Extract<Upstream, { id: Id }>["attr"]
    >;
  },
) => Effect.Effect<A> = (expr, upstream) =>
  Effect.gen(function* () {
    if (isResourceExpr(expr)) {
      const srcId = expr.src.id;
      const src = yield* upstream[srcId as keyof typeof upstream];
      if (!src) {
        // type-safety should prevent this but let the caller decide how to handle it
        return yield* Effect.die(
          new MissingSourceError({
            message: `Source ${srcId} not found`,
            srcId,
          }),
        );
      }
      return src;
    } else if (isLiteralExpr(expr)) {
      return expr.value;
    } else if (isApplyExpr(expr)) {
      return expr.f(yield* evaluate(expr.expr, upstream));
    } else if (isMapArrayExpr(expr)) {
      return yield* Effect.all(
        (yield* evaluate(expr.expr, upstream))
          .map(expr.f)
          .map((item: any) => evaluate(item, upstream)),
      );
    } else if (isFlatMapArrayExpr(expr)) {
      return yield* Effect.all(
        (yield* evaluate(expr.expr, upstream))
          .flatMap(expr.f)
          .map((item: any) => evaluate(item, upstream)),
      );
    } else if (isCallExpr(expr)) {
      const [fn, args, thisType] = yield* Effect.all([
        evaluate(expr.expr, upstream),
        Effect.all(expr.args.map((expr) => evaluate(expr, upstream))),
        evaluate(expr.thisType, upstream),
      ]);
      if (typeof fn === "function") {
        return fn.bind(thisType)(...expr.args);
      } else {
        return yield* Effect.die(
          new Error(`Invalid function: ${JSON.stringify(fn)}`),
        );
      }
    } else if (isEffectExpr(expr)) {
      // TODO(sam): the same effect shoudl be memoized so that it's not run multiple times
      return yield* expr.f(yield* evaluate(expr.expr, upstream));
    } else if (isAllExpr(expr)) {
      return yield* Effect.all(expr.outs.map((out) => evaluate(out, upstream)));
    } else if (isPropExpr(expr)) {
      return (yield* evaluate(expr.expr, upstream))?.[expr.identifier];
    } else if (Array.isArray(expr)) {
      return yield* Effect.all(expr.map((item) => evaluate(item, upstream)));
    } else if (typeof expr === "object" && expr !== null) {
      return Object.fromEntries(
        yield* Effect.all(
          Object.entries(expr).map(([key, value]) =>
            evaluate(value, upstream).pipe(Effect.map((value) => [key, value])),
          ),
        ),
      );
    }
    return expr;
  }) as Effect.Effect<any>;

export type Upstream<O extends Output<any, any, any>> =
  O extends Output<infer V, infer Up, infer Req>
    ? {
        [Id in Up["id"]]: Extract<Up, { id: Id }>;
      }
    : never;

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
  } else if (isCallExpr(expr)) {
    return Object.assign(
      {},
      ...expr.args.map((arg) => upstream(arg)),
      upstream(expr.thisType),
    );
  } else if (isMapArrayExpr(expr) || isFlatMapArrayExpr(expr)) {
    return {
      ...upstream(expr.expr),
      ...upstream(
        expr.f(
          new ItemExpr(expr.expr) as unknown as Expr<A>,
          new IndexExpr(
            expr.expr,
            new LiteralExpr(0),
          ) as unknown as Expr<number>,
        ),
      ),
    };
  } else if (Array.isArray(expr)) {
    return expr.map(_upstream).reduce(toObject, {});
  } else if (typeof expr === "object" && expr !== null) {
    return Object.values(expr)
      .map((v) => _upstream(v))
      .reduce(toObject, {});
  }
  return {};
};

const toObject = <A, B>(acc: B, v: A) => ({
  ...acc,
  ...v,
});

export type ResolveUpstream<A> = A extends
  | undefined
  | null
  | boolean
  | number
  | string
  | symbol
  | bigint
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

type IsAny<T> = 0 extends 1 & T ? true : false;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

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
