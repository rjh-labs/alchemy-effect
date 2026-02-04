// oxlint-disable no-unused-expressions
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as S from "effect/Schema";
import type { ClassTuple } from "../class.ts";
import type { AnyClassSchema } from "../schema.ts";
import type { Annotated } from "./annotated.ts";

export interface Trait<
  Tag extends string = string,
  Errors extends any[] = never,
  Provides extends any[] = never,
> {
  type?: "trait";
  tag: Tag;
  errors?: ClassTuple<Errors>;
  provides?: ClassTuple<Provides>;
  <Target>(target: Target): Apply<Target, this>;
}

export namespace Trait {
  export type Of<A> = A;
  export const apply = <T extends Trait<any, any, any>>(
    tag: T["tag"],
    props: {
      [k in keyof TraitProps<T>]: TraitProps<T>[k];
    },
  ): T => undefined!;
}

export type TraitError<A extends Trait<any, any, any>> = InstanceType<
  Exclude<A["errors"], undefined>[number]
>;

export type TraitProps<A extends Trait<any, any, any>> = {
  [k in keyof _TraitProps<A>]: _TraitProps<A>[k];
};

type _TraitProps<A extends Trait<any, any, any>> = Omit<
  A,
  "type" | "tag" | "provides" | "errors"
> &
  (A["errors"] extends never | undefined
    ? {}
    : {
        errors: Exclude<A["errors"], undefined>;
      }) &
  (A["provides"] extends never | undefined
    ? {}
    : {
        provides: Exclude<A["provides"], undefined>;
      });

export declare function defineTrait<F extends (...args: any[]) => any>(
  tag: NoInfer<ReturnType<F>["tag"]>,
  fn: F,
): F & MiddlewareProviders<ReturnType<F>>;

export declare function defineTrait<T extends Trait, Req extends Trait = never>(
  tag: T["tag"],
  props: {
    [k in keyof TraitProps<T>]: TraitProps<T>[k];
  },
): T & MiddlewareProviders<T, Req>;

export declare function Trait<A extends Trait, Req extends Trait = never>(
  props: TraitProps<A>,
): A & {};

type MiddlewareProviders<A extends Trait, Req extends Trait = never> = {
  effect: <Err = never, Req = never>(
    fn: (
      input: any,
      trait: A,
      next: Effect.Effect<any, any, any>,
    ) => Effect.Effect<any, Err, Req>,
  ) => Layer.Layer<A, TraitError<A> | Err, Req>;
};

export type Apply<Target, T extends Trait<any, any, any>> = ([Target] extends [
  Annotated<infer s, infer t>,
]
  ? Annotated<s, T | t>
  : [Target] extends [S.Struct.Field]
    ? Annotated<Target, T>
    : [Target] extends [AnyClassSchema]
      ? Annotated<Target, T | Annotated.Unwrap<Target>>
      : Target) & {};

// export declare namespace Traits {
//   export type Of<C, Seen = never> = C extends Seen
//     ? never
//     : C extends Annotated<infer S, infer T>
//       ? T | Of<S, Seen>
//       : C extends AnyClassSchema
//         ? OfFields<C["fields"], Seen | C>
//         : C extends S.Struct<any>
//           ? OfFields<C["fields"], Seen | C>
//           : never;

//   type OfFields<F extends S.Struct.Fields, Seen> = {
//     [prop in keyof F]: Of<F[prop], Seen>;
//   }[keyof F];
// }
