import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { Scope } from "effect/Scope";
import type { ScopedPlanStatusSession } from "./apply.ts";
import type { Resource } from "./resource.ts";
import type { Runtime } from "./runtime.ts";

export type Provider<R extends Resource> = Context.TagClass<
  Provider<R>,
  R["type"],
  ProviderService<R>
>;

export type Diff =
  | {
      action: "update" | "noop";
      deleteFirst?: undefined;
    }
  | {
      action: "replace";
      deleteFirst?: boolean;
    };

type BindingData<Res extends Resource> = [Res] extends [Runtime]
  ? Res["binding"][]
  : any[];

export interface ProviderService<Res extends Resource = Resource> {
  // tail();
  // watch();
  // replace(): Effect.Effect<void, never, never>;

  // different interface that is persistent, watching, reloads
  // run?() {}
  read?(input: {
    id: string;
    olds: Res["props"] | undefined;
    // what is the ARN?
    output: Res["attr"] | undefined; // current state -> synced state
    session: ScopedPlanStatusSession;
    bindings: BindingData<Res>;
  }): Effect.Effect<Res["attr"] | undefined, any, Scope>;
  diff?(input: {
    id: string;
    olds: Res["props"];
    news: Res["props"];
    output: Res["attr"];
  }): Effect.Effect<Diff, never, Scope>;
  stub?(input: {
    id: string;
    news: Res["props"];
    session: ScopedPlanStatusSession;
  }): Effect.Effect<Res["attr"], any, Scope>;
  create(input: {
    id: string;
    news: Res["props"];
    session: ScopedPlanStatusSession;
    bindings: BindingData<Res>;
  }): Effect.Effect<Res["attr"], any, Scope>;
  update(input: {
    id: string;
    news: Res["props"];
    olds: Res["props"];
    output: Res["attr"];
    session: ScopedPlanStatusSession;
    bindings: BindingData<Res>;
  }): Effect.Effect<Res["attr"], any, Scope>;
  delete(input: {
    id: string;
    olds: Res["props"];
    output: Res["attr"];
    session: ScopedPlanStatusSession;
    bindings: BindingData<Res>;
  }): Effect.Effect<void, any, Scope>;
}
