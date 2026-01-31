import * as Context from "effect/Context";
import type { Aspect } from "../aspect.ts";

export type ContextPlugin<A extends Aspect.Type<string, any>> = Context.Tag<
  `ContextPlugin<${A["type"]}>`,
  ContextPluginService<A>
>;

export interface ContextPluginService<A extends Aspect.Type<string, any>> {
  context: (a: Aspect.Instance<A>) => string;
}

export const ContextPlugin = <A extends Aspect.Type<string, any>>(
  aspect: A,
): ContextPlugin<A> =>
  Context.GenericTag<`ContextPlugin<${A["type"]}>`, ContextPluginService<A>>(
    `ContextPlugin<${aspect.type}>`,
  );
