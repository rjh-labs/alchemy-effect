import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import type { YieldWrap } from "effect/Utils";
import type { Class } from "../class.ts";
import type { IsAny } from "../util.ts";
import type { Plugins } from "./plugin.ts";
import type { Parameters } from "./tool/parameter.ts";
import type { Result } from "./tool/result.ts";
import type { ToolHandler } from "./tool/tool.ts";

export type Pointer<T> = T | (() => T);

export declare namespace Pointer {
  export type Resolve<R> = R extends () => infer T ? T : R;
}

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
    ? []
    : [Props] extends [S.Struct.Field]
      ? S.Schema<Props>
      : [Props] extends [object]
        ? Class<Props>
        : S.Schema<Props>;
  handler: Handler;
  new (): Aspect<Self, Type, Name, References, Props>;
  props: Props;
}

export declare const defineAspect: <Fn extends AspectType<any>>(
  type: GetAspectType<Fn>["type"],
  ...props: GetAspectType<Fn>["schema"] extends Class<infer C>
    ? IsAny<C> extends true
      ? []
      : [C] extends [S.Struct.Field]
        ? [schema: S.Schema<C>]
        : [C] extends [object]
          ? [cls: Class<C>]
          : [schema: S.Schema<C>]
    : [schema: GetAspectType<Fn>["schema"]]
) => Fn & {
  plugin: Plugins<GetAspectType<Fn>>;
};

type AspectType<Props = any> = AspectObject<Props> | AspectFunction<Props>;

type AspectFunction<Props = any> = <Name extends string>(
  name: Name,
  props?: Props,
) => <References extends any[]>(
  template: TemplateStringsArray,
  ...references: References
) => <Eff extends YieldWrap<Effect.Effect<any, any, any>>>(
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
      : [Eff] extends [YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>]
        ? E
        : never,
    [Eff] extends [never]
      ? never
      : [Eff] extends [YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>]
        ? R
        : never
  >
>;

type AspectObject<Props = any> = <Name extends string>(
  name: Name,
  props?: Props,
) => <References extends any[]>(
  template: TemplateStringsArray,
  ...references: References
) => Aspect<Aspect, string, Name, References, Props>;

type GetAspectType<Fn> = Fn extends (name: string, props?: any) => infer Return
  ? Return extends (...args: any[]) => infer Return2
    ? Return2 extends (...args: any[]) => infer Return3
      ? Return3
      : Return2
    : never
  : never;
