import * as Effect from "effect/Effect";
import { pipe } from "effect";
import type { Resource, AnyResource } from "./resource.ts";
import type { Brand } from "./brand.ts";
import type { From } from "./policy.ts";
import { Table } from "./aws/dynamodb/table.ts";
import * as Data from "effect/Data";
import type { Pipeable } from "effect/Pipeable";

// a special symbol only used at runtime to probe the Output proxy
const OutputSymbol = Symbol.for("alchemy/Output");

export const isOutput = (value: any): value is Output<any> =>
  value && OutputSymbol in value;

export const of = <R extends Resource>(
  resource: R,
): Output<R["attr"], From<R>> =>
  new Source(resource) as unknown as Output<R["attr"], From<R>>;

// TODO(sam): doesn't support disjunct unions very well
export type Output<V, Src extends Resource = any, Req = never> = [
  Extract<Exclude<V, { __brand: unknown }>, object>,
] extends [never]
  ? [Extract<V, string | { __brand: any }>] extends [
      { __brand: unknown } | string,
    ]
    ? Out<V, Src, Req>
    : Out<V, Src, Req>
  : Out<V, Src, Req> &
      ([Extract<V, any[]>] extends [never]
        ? {
            [k in keyof Exclude<V, undefined>]-?: Output<
              Exclude<V, undefined>[k] | Extract<V, undefined>,
              Src,
              Req
            >;
          }
        : Output<
            Extract<V, any[]>[number] | Extract<V, undefined>,
            Src,
            Req
          >[]);

export type OutKind = "source" | "map" | "concat" | "effect";

export interface Out<A = any, Src extends Resource = any, Req = never>
  extends Pipeable {
  kind: OutKind;
  map<V2>(fn: (value: A) => V2): Output<V2, Src, Req>;
  effect<V2, Req2>(
    // Outputs are not allowed to fail, so we use never for the error type
    fn: (value: A) => Effect.Effect<V2, never, Req2>,
  ): Output<V2, Src, Req | Req2>;
  narrow<T>(): Output<A & T, Src, Req>;
  as<T>(): Output<T, Src, Req>;
}

type OutputNode<O = any, Src extends AnyResource = AnyResource, Req = never> =
  | Source<O, Src, Req>
  | Map<any, O, Src, Req>
  | EffectNode<O, O, Src, Req>
  | Concat<Out<O, Src, Req>[]>;

abstract class BaseNode<
  Kind extends OutKind,
  A = any,
  Src extends Resource = any,
  Req = never,
> implements Out<A, Src, Req>
{
  // we use a kind tag instead of instanceof to protect ourselves from duplicate alchemy-effect module imports
  constructor(readonly kind: Kind) {
    return new Proxy(this, {
      has: (_, prop) => (prop === OutputSymbol ? true : prop in this),
      get: (_, prop) => {
        return prop === OutputSymbol
          ? true
          : this[prop as keyof typeof this]
            ? this[prop as keyof typeof this]
            : this.map((value: any) => value?.[prop as keyof typeof value]);
      },
    });
  }
  public map<B>(fn: (value: A) => B): Output<B, Src> {
    return new Map(this as Out<A, Src, Req>, fn) as any;
  }
  public narrow<T>(): Output<A & T, Src> {
    return this as any as Output<A & T, Src>;
  }
  public as<T>(): Output<T, Src> {
    return this as any as Output<T, Src>;
  }
  public effect<B, Req2>(
    fn: (value: A) => Effect.Effect<B, never, Req2>,
  ): Output<B, Src, Req | Req2> {
    return new EffectNode(this as any, fn) as any;
  }
  public pipe(...fns: any[]): any {
    // @ts-expect-error
    return pipe(this, ...fns);
  }
}

const isSource = <Value, Src extends AnyResource, Req = never>(
  node: Out<Value, Src, Req>,
): node is Source<Value, Src, Req> => node.kind === "source";

class Source<Value, Src extends AnyResource, Req = never> extends BaseNode<
  "source",
  Value,
  Src,
  Req
> {
  constructor(public readonly src: Src) {
    super("source");
  }
}

const isMap = <In, Out, Src extends AnyResource>(
  node: any,
): node is Map<In, Out, Src> => node.kind === "map";

class Map<A, B, Src extends AnyResource, Req = never> extends BaseNode<
  "map",
  B,
  Src,
  Req
> {
  constructor(
    public readonly upstream: Out<A, Src, Req>,
    public readonly f: (value: A) => B,
  ) {
    super("map");
  }
}

const isEffectNode = <In, Out, Src extends AnyResource>(
  node: any,
): node is EffectNode<In, Out, Src> => node.kind === "effect";

class EffectNode<
  A,
  B,
  Src extends AnyResource,
  Req = never,
  Req2 = never,
> extends BaseNode<"effect", B, Src, Req> {
  constructor(
    public readonly upstream: Out<A, Src, Req>,
    public readonly f: (value: A) => Effect.Effect<B, never, Req2>,
  ) {
    super("effect");
  }
}

const isConcat = <Outs extends Out[] = Out[]>(
  node: any,
): node is Concat<Outs> => node.kind === "concat";

class Concat<Outs extends Out[]> extends BaseNode<"concat", Outs> {
  constructor(public readonly outs: Outs) {
    super("concat");
  }
}

export class MissingSourceError extends Data.TaggedError("MissingSourceError")<{
  message: string;
  srcId: string;
}> {}

export const interpret: <O, Upstream extends Resource, Req>(
  ast: Out<O, Upstream, Req>,
  sources: {
    [Id in Upstream["id"]]: Effect.Effect<
      Extract<Upstream, { id: Id }>["attr"]
    >;
  },
) => Effect.Effect<O, MissingSourceError> = Effect.fnUntraced(function* <
  O,
  Upstream extends Resource,
  Req,
>(
  ast: Out<O, Upstream, Req>,
  upstream: {
    [Id in Upstream["id"]]: Effect.Effect<
      Extract<Upstream, { id: Id }>["attr"]
    >;
  },
) {
  if (isSource(ast)) {
    const srcId = ast.src.id as Upstream["id"];
    const src = yield* upstream[srcId];
    if (!src) {
      // type-safety should prevenet this but let the caller decide how to handle it
      return yield* Effect.fail(
        new MissingSourceError({
          message: `Source ${srcId} not found`,
          srcId,
        }),
      );
    }
    return src;
  } else if (isMap(ast)) {
    return ast.f(yield* interpret(ast.upstream, upstream));
  } else if (isEffectNode(ast)) {
    // TODO(sam): the same effect shoudl be memoized so that it's not run multiple times
    return yield* ast.f(yield* interpret(ast.upstream, upstream));
  } else if (isConcat(ast)) {
    return yield* Effect.all(ast.outs.map((out) => interpret(out, upstream)));
  } else {
    return yield* Effect.die(`Invalid output node: ${JSON.stringify(ast)}`);
  }
}) as any;

export type Upstream<O extends Out<any, any, any>> =
  O extends Out<infer V, infer Up, infer Req>
    ? {
        [Id in keyof Up]: Extract<Up, { id: Id }>;
      }
    : never;

export const upstream = <O extends Out<any, AnyResource, any>>(
  ast: O,
): {
  [Id in keyof Upstream<O>]: Upstream<O>[Id];
} =>
  (isSource(ast)
    ? { [ast.src.id]: ast.src }
    : isConcat(ast)
      ? Object.assign({}, ...ast.outs.map((out) => upstream(out)))
      : isEffectNode(ast) || isMap(ast)
        ? upstream(ast.upstream)
        : {}) as Upstream<O>;

export const interpolate = <Args extends any[]>(
  template: TemplateStringsArray,
  ...args: Args
): ConcatOutputs<Args> extends Out<any, infer Src, infer Req>
  ? Out<string, Src, Req>
  : never => {
  const outs = filterOutputs(args) as unknown as Out[];
  const outputs = concat(...outs);
  return template.reduce((acc, curr, index) => {
    return acc + curr + (args[index] ?? "");
  }, "") as any;
};

export const concat = <Outs extends Out[]>(...outs: Outs) =>
  new Concat(outs as any) as unknown as ConcatOutputs<Outs>;

export type ConcatOutputs<Outs extends Out[]> = number extends Outs["length"]
  ? [Outs[number]] extends [Out<infer V, infer Src, infer Req>]
    ? Out<V, Src, Req>
    : never
  : ConcatOutputTuple<Outs>;

export type ConcatOutputTuple<
  Outs extends Out[],
  Values extends any[] = [],
  Src extends Resource = never,
  Req = never,
> = Outs extends [infer H, ...infer Tail extends Out[]]
  ? H extends Out<infer V, infer Src2, infer Req2>
    ? ConcatOutputTuple<Tail, [...Values, V], Src | Src2, Req | Req2>
    : never
  : Out<Values, Src, Req>;

export const filterOutputs = <Outs extends any[]>(...outs: Outs) =>
  outs.filter(isOutput) as unknown as FilterOutputs<Outs>;

export type FilterOutputs<Outs extends any[]> = number extends Outs["length"]
  ? Out<
      Extract<Outs[number], Out>["value"],
      Extract<Outs[number], Out>["src"],
      Extract<Outs[number], Out>["req"]
    >
  : FilterOutputTuple<Outs>;

export type FilterOutputTuple<
  Outs extends Out[],
  Values extends any[] = [],
  Src extends Resource = never,
> = Outs extends [infer H, ...infer Tail extends Out[]]
  ? H extends Out<infer V, infer Src2>
    ? FilterOutputTuple<Tail, [...Values, V], Src | Src2>
    : FilterOutputTuple<Tail, Values, Src>
  : Out<Values, Src>;
