import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";

export type ServiceTag<Self, ID extends string, Shape> = Context.TagClass<
  Self,
  ID,
  Shape
> & {
  [key in keyof Shape]: Shape[key] extends (
    ...args: any[]
  ) => Effect.Effect<infer A, infer Err, infer Req>
    ? (...args: Parameters<Shape[key]>) => Effect.Effect<A, Err, Req | Self>
    : Shape[key] extends (
          ...args: any[]
        ) => Stream.Stream<infer A, infer Err, infer Req>
      ? (...args: Parameters<Shape[key]>) => Stream.Stream<A, Err, Req | Self>
      : Shape[key] extends (
            ...args: any[]
          ) => Sink.Sink<infer A, infer In, infer L, infer Err, infer Req>
        ? (
            ...args: Parameters<Shape[key]>
          ) => Sink.Sink<A, In, L, Err, Req | Self>
        : Shape[key];
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
