import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as S from "effect/Schema";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import type { ExcludeAny } from "./util.ts";

export type ServiceTag<Self, ID extends string, Shape> = Context.TagClass<
  Self,
  ID,
  Shape
> & {
  shape: Shape;
} & {
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
            ? Req
            : Impl[k] extends (
                  ...args: any[]
                ) => Stream.Stream<infer _A, infer _Err, infer Req>
              ? Req
              : Impl[k] extends (
                    ...args: any[]
                  ) => Sink.Sink<
                    infer _A,
                    infer _In,
                    infer _L,
                    infer _Err,
                    infer Req
                  >
                ? Req
                : never;
        }[keyof Impl]
    >;
  };
};

export const ServiceTag =
  <ID extends string>(id: ID) =>
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

ServiceTag.make =
  <Self>() =>
  <ID extends string, Shape extends Record<string, S.Schema.All>>(
    id: ID,
    shape: Shape,
  ) =>
    new Proxy(
      Context.Tag(id)<
        any,
        {
          [key in keyof Shape]: S.Schema.Type<Shape[key]>;
        }
      >(),
      {
        get: (target: any, prop: string | symbol) =>
          prop in target
            ? target[prop]
            : (...args: any[]) =>
                target.pipe(
                  Effect.flatMap((service: any) => service[prop](...args)),
                ),
      },
    ) as ServiceTag<
      Self,
      ID,
      {
        [key in keyof Shape]: S.Schema.Type<Shape[key]>;
      }
    >;
