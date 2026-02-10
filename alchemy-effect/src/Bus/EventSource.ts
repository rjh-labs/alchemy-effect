import * as Context from "effect/Context";
import * as S from "effect/Schema";
import type { Stream } from "effect/Stream";
import { STag, type STagClass } from "../STag.ts";
import type { ConsumerClass } from "./Consumer.ts";

export interface EventSourceClass<
  Id extends string,
  Schema extends S.Schema.All,
> extends STagClass<
  EventSourceClass<Id, Schema>,
  `EventSource<${Id}>`,
  Stream<S.Schema.Type<Schema>>
> {
  readonly schema: Schema;
  Consumer<
    Self extends EventSourceClass<Id, Schema>,
    ConsumerId extends string,
  >(
    this: Self,
    id: ConsumerId,
  ): ConsumerClass<ConsumerId, Self>;
}

export const EventSource = <Id extends string, Schema extends S.Schema.All>(
  id: Id,
  props: {
    schema: Schema;
  },
): EventSourceClass<Id, Schema> =>
  STag(id, {
    schema: props.schema,
    Consumer<
      Self extends EventSourceClass<ConsumerId, Schema>,
      ConsumerId extends string,
    >(this: Self, id: ConsumerId) {
      return Context.Tag(id)() as any as ConsumerClass<ConsumerId, Self>;
    },
  })<EventSourceClass<Id, Schema>, Stream<S.Schema.Type<Schema>>>() as any;
