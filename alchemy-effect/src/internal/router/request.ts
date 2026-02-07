import * as S from "effect/Schema";

export const Request = <Name extends string, Fields extends S.Struct.Fields>(
  name: Name,
  fields: Fields,
) => S.Class<S.Struct.Type<Fields>>(name)(fields);
