import * as S from "effect/Schema";
import { Aspect, defineAspect } from "./aspect.ts";

export type AgentId = string;
export const AgentId = S.String.annotations({
  description: "The ID of the agent",
});

export type AgentType = typeof Agent;

export type Agent<
  Name extends string = string,
  References extends any[] = any[],
> = Aspect.Instance<AgentType, Name, References>;

export const Agent = defineAspect("agent");
