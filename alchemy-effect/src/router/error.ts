import * as S from "effect/Schema";

export const Error = <Name extends string, Fields extends S.Struct.Fields>(
  name: Name,
  fields: Fields,
) => S.TaggedError<S.Struct.Type<Fields>>()(name, fields);
