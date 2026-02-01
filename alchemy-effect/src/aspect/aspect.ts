import type { Class } from "../class.ts";
import type { IsAny } from "../util.ts";
import type { Plugins } from "./plugin.ts";

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
> {
  kind: "aspect";
  class: Class<Self>;
  type: Type;
  id: Name;
  template: TemplateStringsArray;
  references: References;
  schema: Class<Props>;
  new (): Aspect<Self, Type, Name, References, Props>;
  props: Props;
}

export declare const defineAspect: <Fn extends AspectFn<any>>(
  type: GetAspectType<Fn>["type"],
  ...props: GetAspectType<Fn>["schema"] extends Class<infer C>
    ? IsAny<C> extends true
      ? []
      : [props: Class<C>]
    : [props: GetAspectType<Fn>["schema"]]
) => Fn & {
  plugin: Plugins<GetAspectType<Fn>>;
};

type AspectFn<Props = any> = <Name extends string>(
  name: Name,
  props?: Props,
) => <References extends any[]>(
  template: TemplateStringsArray,
  ...references: References
) => Aspect<Aspect, string, Name, References, Props>;

type GetAspectType<Fn> = Fn extends (name: string, props?: any) => infer Return
  ? Return extends (...args: any[]) => infer Aspect
    ? Aspect
    : never
  : never;
