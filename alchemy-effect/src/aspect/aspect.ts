import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as S from "effect/Schema";
import type { ContextPlugin, ContextPluginService } from "./context/plugin.ts";
import type { TuiPluginService } from "./tui/plugin.ts";

export type Pointer<T> = T | (() => T);

export declare namespace Pointer {
  export type Resolve<R> = R extends () => infer T ? T : R;
}

export type AspectName = string;

export const isAspect = (a: any): a is Aspect => {
  return (
    typeof a === "object" &&
    a !== null &&
    "type" in a &&
    "id" in a &&
    "template" in a &&
    "references" in a &&
    "fields" in a &&
    "schema" in a
  );
};

export type IAspect<
  Type extends string = string,
  ID extends AspectName = AspectName,
  References extends any[] = any[],
> = {
  readonly type: Type;
  readonly id: ID;
  readonly template: TemplateStringsArray;
  readonly references: References;
};

export type Aspect<
  Type extends string = string,
  Name extends AspectName = AspectName,
  References extends any[] = any[],
  Fields extends S.Struct.Fields = never,
  Props extends S.Struct.Type<Fields> = never,
> = Aspect.Type<Type, Fields> & {
  readonly id: Name;
  readonly template: TemplateStringsArray;
  readonly references: References;
  new (_: never): {};
} & (never extends Fields ? {} : Props);

export namespace Aspect {
  export type Type<
    Type extends string,
    Fields extends S.Struct.Fields | undefined = undefined,
  > = {
    readonly type: Type;
    readonly fields: Fields;
    readonly schema: Aspect.Struct<
      Type,
      Fields extends undefined ? never : Fields
    >;
    readonly plugin: {
      readonly context: {
        effect: <Err, Req>(
          eff: Effect.Effect<
            // @ts-expect-error
            ContextPluginService<Aspect.Type<Type, Fields>>,
            Err,
            Req
          >,
          // @ts-expect-error
        ) => Layer.Layer<ContextPlugin<Aspect.Type<Type, Fields>>, Err, Req>;
        succeed: (
          // @ts-expect-error
          service: ContextPluginService<Aspect.Type<Type, Fields>>,
          // @ts-expect-error
        ) => Layer.Layer<ContextPlugin<Aspect.Type<Type, Fields>>, Err, Req>;
      };
      readonly tui: {
        effect: <Err, Req>(
          eff: Effect.Effect<
            // @ts-expect-error
            TuiPluginService<Aspect.Instance<Aspect.Type<Type, Fields>>>,
            Err,
            Req
          >,
        ) => Layer.Layer<
          // @ts-expect-error
          TuiPluginService<Aspect.Type<Type, Fields>>,
          Err,
          Req
        >;
      };
    };
  } & (undefined extends Fields
    ? <const ID extends string>(
        id: ID,
      ) => <const References extends any[]>(
        template: TemplateStringsArray,
        ...references: References
      ) => Aspect<Type, ID, References, never, never>
    : {
        <
          const ID extends string,
          Props extends S.Struct.Type<Exclude<Fields, undefined>>,
        >(
          id: ID,
          props: Props,
        ): <const References extends any[]>(
          template: TemplateStringsArray,
          ...references: References
        ) => Aspect<Type, ID, References, Exclude<Fields, undefined>, Props>;

        <const IDReferences extends any[]>(
          template: TemplateStringsArray,
          ...references: IDReferences
        ): <Props extends S.Struct.Type<Exclude<Fields, undefined>>>(
          props: Props,
        ) => <const References extends any[]>(
          template: TemplateStringsArray,
          ...references: References
        ) => Aspect<
          Type,
          string,
          [...IDReferences, ...References],
          Exclude<Fields, undefined>,
          Props
        >;

        <Props extends S.Struct.Type<Exclude<Fields, undefined>>>(
          props: Props,
        ): {
          <const ID extends string>(
            id: ID,
          ): <const References extends any[]>(
            template: TemplateStringsArray,
            ...references: References
          ) => Aspect<Type, ID, References, Exclude<Fields, undefined>, Props>;
        };
      });

  export type Instance<
    T,
    Name extends string = string,
    References extends any[] = any[],
    Props extends Aspect.Props<T> = never,
  > = T extends { type: string; fields: any }
    ? Aspect<
        T["type"],
        Name,
        References,
        T["fields"],
        Extract<Props, S.Struct.Type<T["fields"]>>
      >
    : never;

  export type Props<T> =
    T extends Aspect.Type<string, any> ? T["schema"]["Type"] : never;

  export type Fields<Type extends string> = ReturnType<typeof Fields<Type>>;
  export const Fields = <Type extends string>(type: Type) => ({
    type: S.Literal(type),
    id: S.String,
    template: S.Array(S.String),
    references: S.Array(S.Any),
  });

  export const Struct = <
    Type extends string,
    F extends S.Struct.Fields = never,
  >(
    type: Type,
    fields: F,
  ): Struct<Type, F> =>
    // we only use class here so that JSON schema will generate a reference instead of a structural type
    S.Class(type)({
      ...fields,
      ...Fields(type),
    }) as any as Struct<Type, F>;
  export type Struct<
    Type extends string,
    F extends S.Struct.Fields = never,
  > = S.Struct<F & Fields<Type>>;
}

export const defineAspect = ((type, fields) => {
  const schema = Aspect.Struct(type, fields ?? {});
  const builder =
    (id: string, props?: any) =>
    (template: TemplateStringsArray, references: any[]) => {
      return Object.assign(
        class {
          static readonly id = id;
          static readonly template = template;
          static readonly references = references;
          static readonly schema = schema;
          static readonly type = type;
        },
        props ?? {},
      );
    };
  return Object.assign(builder, {
    type,
    schema,
  }) as any;
}) as <
  const Type extends string,
  Fields extends S.Struct.Fields | undefined = undefined,
>(
  type: Type,
  fields?: Fields,
) => Aspect.Type<Type, Fields>;
