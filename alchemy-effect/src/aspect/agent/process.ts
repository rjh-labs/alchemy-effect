import { defineAspect, type Aspect } from "../aspect";

export interface Process<
  Name extends string = string,
  References extends any[] = any[],
> extends Aspect<Process, "process", Name, References> {}

export const Process =
  defineAspect<
    <const Name extends string>(
      name: Name,
    ) => <References extends any[]>(
      template: TemplateStringsArray,
      ...references: References
    ) => Process<Name, References>
  >("process");
