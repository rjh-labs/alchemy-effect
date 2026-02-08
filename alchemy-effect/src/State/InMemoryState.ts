import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ResourceState } from "./ResourceState.ts";
import { State, type StateService } from "./State.ts";

type StackId = string;
type StageId = string;
type ResourceId = string;

export const InMemory = (
  initialState: Record<
    StackId,
    Record<StageId, Record<ResourceId, ResourceState>>
  > = {},
) =>
  Layer.succeed(State, InMemoryService(initialState)) as Layer.Layer<
    State,
    never,
    never
  >;

export const InMemoryService = (
  initialState: Record<
    StackId,
    Record<StageId, Record<ResourceId, ResourceState>>
  > = {},
) => {
  const state = initialState;
  return {
    listStacks: () => Effect.succeed(Array.from(Object.keys(state))),
    // oxlint-disable-next-line require-yield
    listStages: (stack: string) =>
      Effect.succeed(
        Array.from(stack in state ? Object.keys(state[stack]) : []),
      ),
    get: ({
      stack,
      stage,
      resourceId,
    }: {
      stack: string;
      stage: string;
      resourceId: string;
    }) => Effect.succeed(state[stack]?.[stage]?.[resourceId]),
    getReplacedResources: ({
      stack,
      stage,
    }: {
      stack: string;
      stage: string;
    }) =>
      Effect.succeed(
        Array.from(Object.values(state[stack]?.[stage] ?? {}) ?? []).filter(
          (s) => s.status === "replaced",
        ),
      ),
    set: <V extends ResourceState>({
      stack,
      stage,
      resourceId,
      value,
    }: {
      stack: string;
      stage: string;
      resourceId: string;
      value: V;
    }) => {
      const stackState = (state[stack] ??= {});
      const stageState = (stackState[stage] ??= {});
      stageState[resourceId] = value;
      return Effect.succeed(value);
    },
    delete: ({
      stack,
      stage,
      resourceId,
    }: {
      stack: string;
      stage: string;
      resourceId: string;
    }) => Effect.succeed(delete state[stack]?.[stage]?.[resourceId]),
    list: ({ stack, stage }: { stack: string; stage: string }) =>
      Effect.succeed(
        Array.from(Object.keys(state[stack]?.[stage] ?? {}) ?? []),
      ),
  } satisfies StateService;
};
