import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import type { YieldWrap } from "effect/Utils";
import type { Class } from "../class.ts";
import type { Pointer } from "../pointer.ts";
import type { Instance } from "../policy.ts";
import { createPluginBuilder, type Plugins } from "../ui/plugin.ts";
import { TuiPlugin } from "../ui/tui/plugin.ts";
import type { IsAny } from "../util.ts";
import { ContextPlugin } from "./context.ts";
import type { Parameters } from "./tool/parameter.ts";
import type { Result } from "./tool/result.ts";
import type { ToolHandler } from "./tool/tool.ts";

export const isAspect = (a: any): a is Aspect => {
  return (
    typeof a === "object" &&
    a !== null &&
    "type" in a &&
    "id" in a &&
    "template" in a &&
    "references" in a &&
    "fields" in a &&
    "schema" in a
  );
};

export class AspectConfig extends Context.Tag("AspectConfig")<
  AspectConfig,
  {
    cwd: string;
  }
>() {}

export type AspectClass<Fn extends AspectType<any>> = Fn & {
  kind: "aspect";
  type: string;
  schema: GetAspectType<Fn>["schema"];
  plugin: Plugins<GetAspectType<Fn>>;
};

export type AspectLike = {
  kind: "aspect";
  id: string;
  type: string;
  references: any[];
};

export interface Aspect<
  Self = any,
  Type extends string = string,
  Name extends string = string,
  References extends any[] = any[],
  Props = any,
  Handler extends ToolHandler<References> = ToolHandler<References>,
> {
  kind: "aspect";
  class: Class<Self>;
  type: Type;
  id: Name;
  template: TemplateStringsArray;
  references: References;
  schema: IsAny<Props> extends true
    ? any
    : [Props] extends [S.Struct.Field]
      ? S.Schema<Props>
      : [Props] extends [object]
        ? Class<Props> & S.Schema<Props>
        : S.Schema<Props>;
  handle: Handler;
  new (): Aspect<Self, Type, Name, References, Props>;
  props: Props;
}

export const defineAspect: <Fn extends AspectType<any>>(
  type: GetAspectType<Fn>["type"],
  ...props: GetAspectType<Fn>["schema"] extends Class<infer C>
    ? IsAny<C> extends true
      ? []
      : [C] extends [S.Struct.Field]
        ? [schema: S.Schema<C>]
        : [C] extends [object]
          ? [cls: Class<C>]
          : [schema: S.Schema<C>]
    : []
) => AspectClass<Fn> = ((type: string, schema: any) =>
  Object.assign(
    (name: string, data: any) =>
      (template: TemplateStringsArray, ...references: any[]) => {
        const aspect = (handler: any) => ({
          kind: "aspect",
          type,
          id: name,
          template,
          references,
          schema,
          data,
          handler,
          plugin: {
            context: createPluginBuilder(ContextPlugin(type) as any),
            tui: createPluginBuilder(TuiPlugin(type) as any),
          },
        });
        // function declaration so that a class can extends this
        return Object.assign(function (handler: any) {
          return Object.assign(function () {}, aspect(handler));
        }, aspect(undefined));
      },
    {
      kind: "aspect",
      type,
      schema,
      plugin: {
        context: createPluginBuilder(ContextPlugin(type) as any),
        tui: createPluginBuilder(TuiPlugin(type) as any),
      },
    },
  )) as AspectClass<any>;

type AspectType<Props = any> = AspectObject<Props> | AspectFunction<Props>;

type AspectObject<Props = any> = <Name extends string>(
  name: Name,
  props?: Props,
) => <References extends any[]>(
  template: TemplateStringsArray,
  ...references: References
) => Aspect<Aspect, string, Name, References, Props>;

type AspectFunction<Props = any> = <Name extends string>(
  name: Name,
  props?: Props,
) => <References extends any[]>(
  template: TemplateStringsArray,
  ...references: References
) =>
  | (<Eff extends YieldWrap<Effect.Effect<any, any, any>>>(
      handler: (
        input: Parameters.Of<References>,
      ) => Generator<Eff, NoInfer<Result.Of<References>>, never>,
    ) => Aspect<
      Aspect,
      string,
      Name,
      References,
      Props,
      (
        input: Parameters.Of<References>,
      ) => Effect.Effect<
        NoInfer<Result.Of<References>>,
        [Eff] extends [never]
          ? never
          : [Eff] extends [
                YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>,
              ]
            ? E
            : never,
        [Eff] extends [never]
          ? never
          : [Eff] extends [
                YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>,
              ]
            ? R
            : never
      >
    >)
  | (<Handler extends ToolHandler<References>>(
      handler: Handler,
    ) => Aspect<Aspect, string, Name, References, Props, Handler>);

type GetAspectType<Fn> = Fn extends (name: string, props?: any) => infer Return
  ? Return extends (...args: any[]) => infer Return2
    ? Return2 extends (...args: any[]) => infer Return3
      ? Return3
      : Return2
    : never
  : never;

export const deriveGraph = <A extends AspectLike>(agent: A): AspectGraph<A> => {
  const seen = new Set<FQN>();
  return [agent, ...agent.references.flatMap((v) => visit(v, seen))].reduce(
    (acc: AspectGraph<A>, aspect) => ({
      ...acc,
      [aspect.type]: {
        ...acc[aspect.type as keyof AspectGraph<A>],
        [aspect.id as keyof AspectGraph<A>[keyof AspectGraph<A>]]: aspect,
      },
    }),
    {} as AspectGraph<A>,
  );
};

const visit = <A>(a: A, seen: Set<FQN>): Aspect[] => {
  if (isAspect(a)) {
    const fqn = getFqn(a);
    if (!seen.has(fqn)) {
      seen.add(fqn);
      return [a, ...a.references.flatMap((v) => visit(v, seen))];
    }
  } else if (Array.isArray(a)) {
    return a.flatMap((v) => visit(v, seen));
  } else if (a instanceof Set) {
    return Array.from(a).flatMap((v) => visit(v, seen));
  } else if (a instanceof Map) {
    return Array.from(a.values()).flatMap((v) => visit(v, seen));
  } else if (typeof a === "object" && a !== null) {
    return Object.values(a).flatMap((v) => visit(v, seen));
  }
  return [];
};

export type AspectGraph<A extends AspectLike> = {
  [type in AspectSet<A>["type"]]: {
    [id in Extract<AspectSet<A>, { type: type }>["id"]]: Extract<
      Extract<AspectSet<A>, { type: type }>,
      { id: id }
    >;
  };
};

export type AspectCategory<Aspects extends Aspect> = {
  [id in keyof Aspects["id"]]: Extract<Aspects, { id: id }>;
};

export type AspectSet<A extends AspectLike = any> =
  | A
  | Visit<A["references"][number], FQN<A>>;

type Visit<Value, Seen extends string = never> =
  Pointer.Resolve<Value> extends infer A
    ? A extends {
        type: string;
        id: string;
        references: infer References extends any[];
      }
      ? FQN<A> extends Seen
        ? never
        : Instance<A> | Visit<References[number], Seen | FQN<A>>
      : A extends readonly (infer I)[]
        ? Visit<I, Seen>
        : A extends Record<string, infer V>
          ? Visit<V, Seen>
          : never
    : never;

type FQN<A extends { type: string; id: string } = any> = A["id"] extends string
  ? `${A["type"]}:${A["id"]}`
  : never;

const getFqn = <A extends { type: string; id: string }>(a: A): FQN<A> =>
  `${a.type}:${a.id}` as FQN<A>;

export type AspectKinds<A extends Aspect> = {
  [type in keyof AspectGraph<A>]: {
    // @ts-expect-error
    [id in keyof AspectGraph<A>[type]]: InstanceType<
      // @ts-expect-error
      AspectGraph<A>[type][id]["class"]
    >;
    // @ts-expect-error
  }[keyof AspectGraph<A>[type]];
}[keyof AspectGraph<A>];
