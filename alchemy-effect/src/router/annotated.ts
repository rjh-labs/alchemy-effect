import type { Trait } from "./trait.ts";

export type Annotated<S, T extends Trait<any, any, any>> = S & {
  /** @internal phantom type */
  S: S;
  type: "annotated";
  /** @internal phatom */
  traits: T;
};

export declare namespace Annotated {
  export type Unwrap<T> = T extends Annotated<infer _, infer t> ? t : never;
}
