import { FileSystem } from "@effect/platform/FileSystem";
import type { HttpClient } from "@effect/platform/HttpClient";
import { Path } from "@effect/platform/Path";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as App from "./App.ts";
import { type AppliedPlan } from "./Apply.ts";
import type { CLI } from "./internal/cli/service.ts";
import { DotAlchemy } from "./internal/config/dot-alchemy.ts";
import type { AnyService } from "./internal/service.ts";
import type { Instance } from "./internal/util/instance.ts";
import type { DerivePlan, Providers, TraverseResources } from "./plan.ts";
import type { Ref } from "./Ref.ts";
import type { AnyResource } from "./Resource.ts";
import { type StageConfig, type Stages } from "./Stage.ts";
import * as State from "./State.ts";

export const defineStack = <
  const Name extends string,
  Resources extends (AnyResource | AnyService)[],
  Req = never,
  Err = never,
>(
  stack: StackConfig<Name, Resources, Req, Err>,
): Stack<Name, Instance<Resources[number]>, Req, Err> => stack as any;

export const define = defineStack;

export type StackConfig<
  Name extends string,
  Resources extends (AnyResource | AnyService)[] = (AnyResource | AnyService)[],
  StagesReq = never,
  StagesErr = never,
  TapReq = never,
  TapErr = never,
> = {
  name: Name;
  stages: Stages<StagesReq, StagesErr>;
  resources: Resources;
  providers: Layer.Layer<
    Providers<Instance<Resources[number]>>,
    any,
    App.App | FileSystem | Path | DotAlchemy | HttpClient
  >;
  state?: Layer.Layer<State.State>;
  tap?: (
    output: StackOutput<Instance<Resources[number]>>,
  ) => Effect.Effect<any, TapErr, TapReq>;
} & (Exclude<NoInfer<StagesReq | TapReq>, BuiltInServices> extends never
  ? {
      layers?: never;
    }
  : {
      layers: Layer.Layer<
        Exclude<StagesReq | TapReq, BuiltInServices>,
        never,
        never
      >;
    });

export type StackOutput<Resources extends AnyResource | AnyService> =
  AppliedPlan<DerivePlan<Resources>>;

export type Stack<
  Name extends string = string,
  Resources extends AnyResource | AnyService = any,
  StagesReq = any,
  StagesErr = any,
  TapReq = any,
  TapErr = any,
> = {
  name: Name;
  stages: Stages<StagesReq, StagesErr>;
  resources: Resources[];
  providers: Layer.Layer<Providers<Resources>, any, BuiltInServices>;
  state?: Layer.Layer<State.State>;
  cli?: Layer.Layer<CLI>;
  tap?: (output: StackOutput<Resources>) => Effect.Effect<void, TapErr, TapReq>;
} & (Exclude<StagesReq | TapReq, BuiltInServices> extends never
  ? {
      layers?: never;
    }
  : {
      layers: Layer.Layer<
        Exclude<StagesReq | TapReq, BuiltInServices>,
        never,
        never
      >;
    });

export type StackName<S extends Stack> =
  S extends Stack<infer Name, infer _> ? Name : never;

export type StackResources<S extends Stack> =
  S extends Stack<infer _, infer Resources> ? Resources : never;

export type BuiltInServices =
  | App.App
  | FileSystem
  | Path
  | DotAlchemy
  | HttpClient;

export interface StackRefConfig<S extends Stack> extends StageConfig {
  stack: S extends Stack<infer Name, any> ? Name : never;
  stage?: string;
}

export type StackRef<Resources extends AnyResource | AnyService> = {
  [Id in keyof AsRecord<Resources>]: Ref<AsRecord<Resources>[Id]>;
};

type AsRecord<Resources extends AnyResource | AnyService> = {
  [Id in TraverseResources<Resources>["id"]]: Extract<
    TraverseResources<Resources>,
    { id: Id }
  >;
};
