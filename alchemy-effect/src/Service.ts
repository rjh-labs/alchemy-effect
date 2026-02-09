import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";

export const Tag = Context.Tag;

type WidenReq<T> = T extends (...args: infer Args) => infer Out
  ? // we lose generics here
    (...args: Args) => WidenReq<Out>
  : T extends Effect.Effect<infer S, infer Err, infer _>
    ? Effect.Effect<S, Err, any>
    : T extends Stream.Stream<infer S, infer Err, infer _>
      ? Stream.Stream<S, Err, any>
      : T extends Sink.Sink<infer A, infer In, infer L, infer Err, infer _>
        ? Sink.Sink<A, In, L, Err, any>
        : T extends any[]
          ? WidenReqArray<T>
          : T extends object
            ? {
                [k in keyof T]: WidenReq<T[k]>;
              }
            : T;

type WidenReqArray<T extends any[]> = T extends [infer H, ...infer Tail]
  ? [WidenReq<H>, ...WidenReqArray<Tail>]
  : [];

type ExtractReq<T> = T extends (...args: any[]) => infer Out
  ? ExtractReq<Out>
  : T extends Effect.Effect<infer _A, infer _Err, infer Req>
    ? Req
    : T extends Stream.Stream<infer _A, infer _Err, infer Req>
      ? Req
      : T extends Sink.Sink<
            infer _A,
            infer _In,
            infer _L,
            infer _Err,
            infer Req
          >
        ? Req
        : T extends any[]
          ? ExtractReq<T[number]>
          : T extends object
            ? ExtractReq<T[keyof T]>
            : never;

export declare const effect: {
  <I, S>(
    tag: Context.Tag<I, S>,
  ): <E, R, Impl extends WidenReq<S>>(
    effect: Effect.Effect<Impl, E, R>,
  ) => Layer.Layer<I, E, R | ExtractReq<Impl>>;

  //
  <T extends Context.Tag<any, any>, Impl extends WidenReq<T["Service"]>, E, R>(
    tag: T,
    effect: Effect.Effect<Impl, E, R>,
  ): Layer.Layer<T["Identifier"], E, R | ExtractReq<Impl>>;
};
