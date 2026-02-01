import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { TuiPlugin, TuiPluginService } from "../tui/plugin.ts";
import type { Aspect } from "./aspect.ts";
import type { ContextPlugin, ContextPluginService } from "./context/plugin.ts";

export type Plugins<A extends Aspect> = {
  readonly context: Plugin<ContextPlugin<A>, ContextPluginService<A>>;
  readonly tui: Plugin<TuiPlugin<A>, TuiPluginService<A>>;
};

export type Plugin<Tag, Service> = {
  effect: <Err, Req>(
    eff: Effect.Effect<Service, Err, Req>,
  ) => Layer.Layer<Tag, Err, Req>;
  succeed: (service: Service) => Layer.Layer<Tag>;
};

export type TuiPlugins<C> = C extends Aspect ? TuiPlugin<C> : never;

export type ContextPlugins<C> = C extends Aspect ? ContextPlugin<C> : never;
