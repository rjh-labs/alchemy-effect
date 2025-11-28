import type { Input } from "./input.ts";

export type MaybeUnknown<T> = {
  [k in keyof T]: true extends Input.IsOut<T[k]>
    ? Input.Resolve<T[k]> | Unknown
    : T[k];
};
export interface Unknown {
  /** @internal */
  __alchemy_unknown: true;
}
export const isUnknown = (value: unknown): value is Unknown =>
  typeof value === "object" && value !== null && "__alchemy_unknown" in value;
