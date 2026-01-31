import { Aspect, defineAspect } from "./aspect.ts";

export type Organization<
  Name extends string = string,
  References extends any[] = any[],
> = Aspect<"organization", Name, References>;

export const Organization = defineAspect("organization");
