import * as S from "effect/Schema";

/** A Schema representing a Schema */
export type Field = S.Struct.Field; // needs to be a Field to support S.optional(..)
export const Field = S.suspend(
  (): [Field] extends [any] ? S.Schema<Field> : never => S.Any,
);

type FunctionType = (...args: any[]) => any;
export type Function<F extends FunctionType = FunctionType> = S.Schema<F>;
export const Function: S.Schema<FunctionType> & {
  <T extends FunctionType>(T: T): Function<T>;
} = S.suspend((): S.Schema<FunctionType> => S.Any) as any;
