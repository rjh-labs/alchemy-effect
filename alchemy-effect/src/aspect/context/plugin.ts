import * as Context from "effect/Context";
import type { Aspect } from "../aspect.ts";

export type ContextPlugin<A extends Aspect> = Context.Tag<
  `ContextPlugin<${A["type"]}>`,
  ContextPluginService<A>
>;

export interface ContextPluginService<A extends Aspect> {
  context: (a: A) => string;
}

export const ContextPlugin = <A extends Aspect>(aspect: A): ContextPlugin<A> =>
  Context.GenericTag<`ContextPlugin<${A["type"]}>`, ContextPluginService<A>>(
    `ContextPlugin<${aspect.type}>`,
  );
