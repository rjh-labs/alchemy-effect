import type * as S from "../Schema.ts";

export interface AnyOf<in out T> {
  readonly anyOf: T[];
}
type Generalize<T> = T extends S.Schema<infer U> ? U : T;

export const anyOf = <const T>(...anyOf: T[]): AnyOf<Generalize<T>> => ({
  anyOf: anyOf as Generalize<T>[],
});
