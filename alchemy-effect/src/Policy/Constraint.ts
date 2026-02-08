import type { AnyOf } from "./AnyOf.ts";

export type Constraint<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends never
      ? never
      : T[k] extends AnyOf<never>
        ? never
        : k;
  }[keyof T]
>;
