import type * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import type { Capability } from "./capability.ts";
import type { ExcludeAny } from "./util/types.ts";

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
