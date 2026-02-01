import { defineAspect, type Aspect } from "../aspect.ts";

export interface Folder<
  Name extends string = string,
  References extends any[] = any[],
> extends Aspect<Folder, "folder", Name, References> {}

export const Folder =
  defineAspect<
    <const Name extends string>(
      name: Name,
    ) => <References extends any[]>(
      template: TemplateStringsArray,
      ...references: References
    ) => Folder<Name, References>
  >("folder");
