import * as S from "effect/Schema";
import * as Stream from "effect/Stream";
import type { STagClass } from "../STag.ts";
import type { EventSourceClass } from "./EventSource.ts";

export interface ConsumerClass<
  ID extends string,
  Source extends EventSourceClass<any, any>,
> extends STagClass<
  ConsumerClass<ID, Source>,
  `${ID}: Consumer<${Source["key"]}>`,
  {
    consume: (
      stream: Stream.Stream<S.Schema.Type<Source["schema"]>>,
    ) => Stream.Stream<S.Schema.Type<Source["schema"]>>;
  }
> {
  readonly source: Source;
  readonly inputSchema: Source["schema"];
  readonly input: S.Schema.Type<this["inputSchema"]>;
}
