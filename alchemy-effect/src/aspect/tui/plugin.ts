// TODO: not sure if we should be depending on react types
import type { JSX } from "react";

import * as Context from "effect/Context";
import type { Aspect } from "../aspect.ts";

export type TuiPlugin<A extends Aspect.Type<string, any>> = Context.Tag<
  `TuiPlugin<${A["type"]}>`,
  TuiPluginService<A>
>;

export interface TuiPluginService<A extends Aspect.Type<string, any>> {
  /** Render a list of Aspects in the TUI sidebar */
  sidebar?: (a: Aspect.Instance<A>[]) => JSX.Element;
  /** Render the content of an Aspect in the TUI */
  content?: (a: Aspect.Instance<A>) => JSX.Element;
}

export const TuiPlugin = <A extends Aspect.Type<string, any>>(
  aspect: A,
): TuiPlugin<A> =>
  Context.GenericTag<`TuiPlugin<${A["type"]}>`, TuiPluginService<A>>(
    `TuiPlugin<${aspect.type}>`,
  );
