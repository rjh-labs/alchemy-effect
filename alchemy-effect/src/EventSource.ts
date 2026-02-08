import * as Context from "effect/Context";
import * as S from "effect/Schema";

export interface EventSourceProps<Event extends S.Schema.All> {
  event: Event;
}

export const EventSource =
  <Self>() =>
  <Identifier extends string, Event extends S.Schema.All>(
    id: Identifier,
    props: EventSourceProps<Event>,
  ) =>
    Context.Tag(id)<
      Self,
      {
        // TODO
      }
    >();
