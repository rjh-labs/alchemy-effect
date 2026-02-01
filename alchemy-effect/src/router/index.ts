// oxlint-disable no-unused-expressions
import * as S from "effect/Schema";

export interface Trait<Tag, A = never, Err = never, Req = never> {
  type: "trait";
  _tag: Tag;
  A: A;
  Err: Err;
  Req: Req;
}

export declare namespace Traits {
  export type Of<T> = T extends Annotated<infer _, infer t> ? t : never;
}

export type Apply<S, T extends Trait<any, any, any, any>> =
  S extends Annotated<infer s, infer t> ? Annotated<s, T | t> : Annotated<S, T>;

export type Annotated<S, T extends Trait<any, any, any, any>> = S & {
  type: "annotated";
  /** @internal phatom */
  _traits: T;
  traits: {
    [tag in T["_tag"]]: Extract<T, { _tag: tag }>;
  };
};

export declare const trait: {
  <T extends Trait<string, never, any, any>>(_tag: T["_tag"]): TraitFn<T>;
  <T extends Trait<string, any, any, any>>(
    _tag: T["_tag"],
    data: T["A"],
  ): TraitFn<T>;
};

// TODO(sam): figure out why overloads did not work here
// for some reason it just didn't work for S.String.pipe(Auth), but did work for Auth(S.String)
// ... something weird going on with pipe ...
export type TraitFn<T extends Trait<any, any, any, any>> = <Target>(
  target: Target,
) => Target extends S.Struct.Field
  ? Apply<Target, T>
  : Target extends S.Struct.Fields
    ? <Clss extends S.Class<any, any, any, any, any, any, any>>(
        c: Clss,
      ) => Clss extends S.Class<
        infer Self,
        infer Fields,
        infer I,
        infer R,
        infer C,
        infer Inherited,
        infer Proto
      >
        ? Annotated<
            S.Class<Self, Fields & Target, I, R, C, Inherited, Proto>,
            T | Traits.Of<Clss>
          >
        : never
    : Target extends S.Class<
          infer Self,
          infer Fields,
          infer I,
          infer R,
          infer C,
          infer Inherited,
          infer Proto
        >
      ? Annotated<
          S.Class<Self, Fields, I, R, C, Inherited, Proto>,
          T | Traits.Of<Target>
        >
      : never;

// Request, Response, Error

export const Request = <Name extends string, Fields extends S.Struct.Fields>(
  name: Name,
  fields: Fields,
) => S.Class<S.Struct.Type<Fields>>(name)(fields);

export const Response = <Name extends string, Fields extends S.Struct.Fields>(
  name: Name,
  fields: Fields,
) => S.Class<S.Struct.Type<Fields>>(name)(fields);

export const Error = <Name extends string, Fields extends S.Struct.Fields>(
  name: Name,
  fields: Fields,
) => S.TaggedError<S.Struct.Type<Fields>>()(name, fields);

// EXAMPLE

// traits:
export type Auth = Trait<"Authorization">;
export const Auth = trait<Auth>("Authorization");

// trat with Data captured at runtime in the trait
export type Test<Data extends string = string> = Trait<"Test", Data>;
export const Test = <D extends string>(data: D) => trait<Test<D>>("Test", data);

export const Authorized = trait<Auth>("Authorization")({
  Authorization: S.String.pipe(Auth, Test("data")),
});

// decorated schemas and classes
// Annotated<typeof S.String, Auth | Test<"data">>
const _string = S.String.pipe(Auth, Test("data"));
const _optional = S.String.pipe(S.optional, Auth, Test("data"));

export class ListTodosRequest extends Request("ListTodosRequest", {
  key: S.String,
}).pipe(Authorized) {}
ListTodosRequest.fields.key;
// property injected by the trait
ListTodosRequest.fields.Authorization;
// @ts-expect-error - field does not exist
ListTodosRequest.fields.nonExistent;
ListTodosRequest.traits.Authorization; // type: Auth

export class UnauthorizedError extends Error("UnauthorizedError", {
  message: S.String,
}) {}
