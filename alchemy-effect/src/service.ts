import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const Service = Context.Tag;

export const effect = <
  Tag extends Context.Tag<any, any>,
  A extends Tag["Service"],
  Err = never,
  Req = never,
>(
  tag: Tag,
  effect: Effect.Effect<A, Err, Req>,
) => Layer.effect(tag, effect);

import * as S from "effect/Schema";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import type { Capability } from "./Capability.ts";
import type { ExcludeAny } from "./internal/util/types.ts";

export type ServiceTag<Self, ID extends string, Shape> = Context.TagClass<
  Self,
  ID,
  Shape
> & {
  [key in keyof Shape]: Shape[key] extends (
    ...args: any[]
  ) => Effect.Effect<infer A, infer Err, infer Req>
    ? (
        ...args: Parameters<Shape[key]>
      ) => Effect.Effect<A, Err, ExcludeAny<Req> | Self>
    : Shape[key] extends (
          ...args: any[]
        ) => Stream.Stream<infer A, infer Err, infer Req>
      ? (
          ...args: Parameters<Shape[key]>
        ) => Stream.Stream<A, Err, ExcludeAny<Req> | Self>
      : Shape[key] extends (
            ...args: any[]
          ) => Sink.Sink<infer A, infer In, infer L, infer Err, infer Req>
        ? (
            ...args: Parameters<Shape[key]>
          ) => Sink.Sink<A, In, L, Err, ExcludeAny<Req> | Self>
        : Shape[key];
} & {
  make: <Impl extends Shape>(impl: Impl) => Impl;
  layer: {
    effect: <Impl extends Shape, Err = never, Req = never>(
      effect: Effect.Effect<Impl, Err, Req>,
    ) => Layer.Layer<
      Self,
      Err,
      | Req
      | {
          [k in keyof Impl]: Impl[k] extends (
            ...args: any[]
          ) => Effect.Effect<infer _A, infer _Err, infer Req>
            ? ExcludeAny<Req>
            : Impl[k] extends (
                  ...args: any[]
                ) => Stream.Stream<infer _A, infer _Err, infer Req>
              ? ExcludeAny<Req>
              : Impl[k] extends (
                    ...args: any[]
                  ) => Sink.Sink<
                    infer _A,
                    infer _In,
                    infer _L,
                    infer _Err,
                    infer Req
                  >
                ? ExcludeAny<Req>
                : never;
        }[keyof Impl]
    >;
    succeed: <Impl extends Shape>(
      effect: Impl,
    ) => Layer.Layer<
      Self,
      never,
      {
        [k in keyof Impl]: Impl[k] extends (
          ...args: any[]
        ) => Effect.Effect<infer _A, infer _Err, infer Req>
          ? ExcludeAny<Req>
          : Impl[k] extends (
                ...args: any[]
              ) => Stream.Stream<infer _A, infer _Err, infer Req>
            ? ExcludeAny<Req>
            : Impl[k] extends (
                  ...args: any[]
                ) => Sink.Sink<
                  infer _A,
                  infer _In,
                  infer _L,
                  infer _Err,
                  infer Req
                >
              ? ExcludeAny<Req>
              : never;
      }[keyof Impl]
    >;
  };
};

export const ServiceTag =
  <ID extends string>(
    id: ID,
  ): {
    <Self, Shape>(): ServiceTag<Self, ID, Shape>;
    <Self>(): <ID extends string, Shape extends Record<string, S.Schema.All>>(
      shape: Shape,
    ) => ServiceTag<
      Self,
      ID,
      {
        [key in keyof Shape]: S.Schema.Type<Shape[key]>;
      }
    >;
  } =>
  <Self, Shape>() =>
    new Proxy(Context.Tag(id)<Self, Shape>(), {
      get: (target: any, prop: string | symbol) =>
        prop in target
          ? target[prop]
          : (...args: any[]) =>
              target.pipe(
                Effect.flatMap((service: any) => service[prop](...args)),
              ),
    }) as ServiceTag<Self, ID, Shape>;

export type TagTypeId = typeof TagTypeId;
export const TagTypeId = "alchemy/Service" as const;

export interface TagClass<
  Self = any,
  Id extends string = string,
  Type = any,
> extends Context.Tag<Self, Type> {
  new (_: never): TagClassShape<Id, Type>;
  readonly key: Id;
}

export interface TagClassShape<Id, Shape> {
  readonly [TagTypeId]: TagTypeId;
  readonly Type: Shape;
  readonly Id: Id;
}

export type Capabilities<Shape> = Shape extends (...args: any[]) => infer Return
  ? Capabilities<Return>
  : Shape extends Effect.Effect<infer _A, infer _Err, infer Req>
    ? ExcludeAny<Extract<Req, Capability>>
    : Shape extends Stream.Stream<infer _A, infer _Err, infer Req>
      ? ExcludeAny<Extract<Req, Capability>>
      : Shape extends Sink.Sink<
            infer _A,
            infer _In,
            infer _L,
            infer _Err,
            infer Req
          >
        ? ExcludeAny<Extract<Req, Capability>>
        : never;

export const Tag =
  <const ID extends string>(id: ID) =>
  <Self, Contract>(): TagClass<Self, ID, Contract> =>
    undefined!;

export interface Service<Shape, Err, Req, Cap> {}

export const effect = <
  Tag extends TagClass,
  A extends Impl<Tag["Identifier"], Tag["Service"]>,
  Err = never,
  Req = never,
>(
  tag: Tag,
  effect: Effect.Effect<A, Err, Req>,
): Service<
  Tag["Service"],
  Err,
  Req,
  {
    [k in keyof A]: A[k] extends (
      ...args: any[]
    ) => Effect.Effect<infer _A, infer _Err, infer Req>
      ? ExcludeAny<Req>
      : A[k] extends (
            ...args: any[]
          ) => Stream.Stream<infer _A, infer _Err, infer Req>
        ? ExcludeAny<Req>
        : A[k] extends (
              ...args: any[]
            ) => Sink.Sink<infer _A, infer _In, infer _L, infer _Err, infer Req>
          ? ExcludeAny<Req>
          : never;
  }[keyof A]
> => undefined!;

export const succeed = <Tag extends ServiceTagClass>(tag: Tag, service: Tag) =>
  undefined!;

type Impl<Self, Shape> = {
  [key in keyof Shape]: Shape[key] extends (
    ...args: infer Args extends any[]
  ) => Effect.Effect<infer A, infer Err, infer _Req>
    ? (...args: Args) => Effect.Effect<A, Err, any> // allow any so the user can provide any
    : Shape[key] extends (
          ...args: any[]
        ) => Stream.Stream<infer A, infer Err, infer Req>
      ? (
          ...args: Parameters<Shape[key]>
        ) => Stream.Stream<A, Err, ExcludeAny<Req> | Self>
      : Shape[key] extends (
            ...args: any[]
          ) => Sink.Sink<infer A, infer In, infer L, infer Err, infer Req>
        ? (
            ...args: Parameters<Shape[key]>
          ) => Sink.Sink<A, In, L, Err, ExcludeAny<Req> | Self>
        : Shape[key];
};
