import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as S from "effect/Schema";
import * as Stream from "effect/Stream";
import type { Instance } from "./Util/instance.ts";

export interface EventSourceProps<Event extends S.Schema.All> {
  schema: Event;
}

export const EventSource =
  <Self>() =>
  <Id extends string, Schema extends S.Schema.All>(
    id: Id,
    props: EventSourceProps<Schema>,
  ) =>
    Context.Tag(id)<Self, Stream.Stream<S.Schema.Type<Schema>>>();

export type Consumer<Source extends EventSource, Err = never, Req = never> = (
  stream: Stream.Stream<Source["event"], Err, Req>,
) => Stream.Stream<Source["event"], Err, Req>;

export const consume: {
  <Source extends EventSourceClass, Err = never, Req = never>(
    eventSource: Source,
    consume: Consumer<Instance<Source>, Err, Req>,
  ): any;

  //
  <
    Source extends EventSourceClass,
    EffectErr = never,
    EffectReq = never,
    StreamErr = never,
    StreamReq = never,
  >(
    eventSource: Source,
    consume: Effect.Effect<
      Consumer<Instance<Source>, StreamErr, StreamReq>,
      EffectErr,
      EffectReq
    >,
  ): Layer.Layer<Instance<Source>, EffectErr, EffectReq>;
} = (eventSource: any, consume: any) =>
  class {
    static readonly eventSource = eventSource;
    static readonly consume = consume;
  };

export const success = <Source extends EventSource, Err = never, Req = never>(
  eventSource: Source,
  stream: Stream.Stream<Source["event"], Err, Req>,
) =>
  Effect.gen(function* () {
    return stream;
  });

export const effect = <
  Source extends EventSource,
  EffectErr = never,
  EffectReq = never,
  StreamErr = never,
  StreamReq = never,
>(
  eventSource: Source,
  effect: Effect.Effect<
    Stream.Stream<Source["event"], StreamErr, StreamReq>,
    EffectErr,
    EffectReq
  >,
) =>
  Effect.gen(function* () {
    return yield* effect;
  });
