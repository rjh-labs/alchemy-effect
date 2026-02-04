import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
// oxlint-disable no-unused-expressions
import * as S from "effect/Schema";
import * as Router from "./index.ts";
import { defineTrait, Trait } from "./index.ts";

// EXAMPLE

// export type Authorized = Trait<"Authorization", never, MyError, User>;

export class UnauthorizedError extends Router.Error("UnauthorizedError", {
  message: S.String,
}) {}

export class User extends Context.Tag("User")<
  User,
  {
    userId: string;
    email: string;
  }
>() {}

export class Organization extends Context.Tag("Organization")<
  Organization,
  {
    organizationId: string;
    name: string;
  }
>() {}

export interface Header<
  Name extends string | undefined = undefined,
> extends Trait<"Header"> {
  name: Name;
}

export const Header = defineTrait(
  "Header",
  <Name extends string | undefined = undefined>(
    name: Name = undefined as Name,
  ) =>
    Trait.apply<Header<Name>>("Header", {
      name,
    }),
);

type Protocol = any;
const Protocol =
  <Tag extends string>(tag: Tag) =>
  <Self>() =>
    Context.Tag(tag)<Self, Protocol>();

export class Ec2Query extends Protocol("Ec2Query")<Ec2Query>() {}

export const ec2QueryLive = Layer.effect(
  Ec2Query,
  Effect.gen(function* () {
    yield* MyDep;
  }),
);

// Authenticated (to this server)
// Authorized (to this data)

export interface Authenticated<
  FieldName extends string = "Authorization",
> extends Trait<"Authenticated", never, [User]> {
  fieldName: FieldName;
}

export const Authenticated = defineTrait(
  "Authenticated",
  <FieldName extends string = "Authorization">(
    fieldName: FieldName = "Authorization" as FieldName,
  ) =>
    Trait.apply<Authenticated<FieldName>>("Authenticated", {
      provides: [User],
      fieldName,
    }),
);

export const authenticatedLive = Authenticated.effect(
  Effect.fn(function* (input, trait, next) {
    const authToken = input[trait.fieldName];
    return yield* Effect.provideService(User, {
      userId: authToken,
      email: "test@test.com",
    })(next);
  }),
);

export interface Authorized extends Trait<"Authorized", [UnauthorizedError]> {}

export const Authorized = defineTrait<Authorized>("Authorized", {
  errors: [UnauthorizedError],
});

Authorized.effect(
  Effect.fn(function* (input, trait) {
    input;
    trait;
  }),
);

export class MyRequest extends Router.Request("MyRequest", {
  authorization: Authorization,
}) {}

export class MyResponse extends Router.Response("MyResponse", {
  key: S.String,
}) {}

const createRoute = <
  const Name extends string,
  Input extends MyRequest,
  Output extends MyResponse,
>(
  name: Name,
  props: {
    input: Input;
    output: Output;
    handler: (request: Input) => Effect.Effect<Output, never, never>;
  },
) => Router.Route(name, props).pipe(Authenticated(), Authorized);

// Route<,,, Authenticate | Authorized>
export const createEC2Instance = createRoute("CreateEC2Instance", {
  // this ...
  input: MyRequest, // it can provide additional requirements
  // "you must provide the AuthService, but middleware chain is already formed?"
  output: MyResponse,
  protocols: [Ec2Query, AWSJson1_0],
  // ... can't constraint this:
  handler: Effect.fn(function* (request) {
    return {
      key: `${request.id} + ${request.Authorization}`,
    };
  }),
});

export default Router.make([
  // error Route<,,, Authenticate | Authorized> is not assignable to Route<,,, never>
  createEC2Instance,
]).pipe(
  Layer.provide(
    Layer.mergeAll(
      ec2QueryLive,
      Layer.provideMerge(authenticatedLive, cloudflareLive),
      authorizedLive,
    ),
  ),
  Router.serve,
);

// trat with Data captured at runtime in the trait
export type Test<Data extends string = string> = Trait<"Test", Data>;
export const Test = <D extends string>(data: D) => Trait<Test<D>>("Test", data);

class MyError extends Router.Error("MyError", {
  message: S.String,
}) {}

// A -> B

export const AuthorizedLive = Trait.effect(Authorized, function* (request) {
  // pulling a requirement here
  const authService = yield* AuthService;

  yield* MyError();
});

// decorated schemas and classes
// Annotated<typeof S.String, Auth | Test<"data">>
const _string = S.String.pipe(Authorization, Test("data"));
const _optional = S.String.pipe(S.optional, Authorization, Test("data"));

export class ListTodosRequest extends Request("ListTodosRequest", {
  key: S.String,
}).pipe(Authorized) {}

ListTodosRequest.fields.key;
// property injected by the trait
ListTodosRequest.fields.Authorization;
// @ts-expect-error - field does not exist
ListTodosRequest.fields.nonExistent;
ListTodosRequest.traits.Authorization; // type: Auth

// DEBUG

const __ = S.String.pipe(Public("wireName"));

const _header = S.String.pipe(Header("OtherName"), Test("data"));

// next
export type Private = Trait<"Private">;
export const Private = Trait<Private>("Private");

const Test2 = <Target extends S.Struct.Field>(
  target: Target,
): Apply<Target, Private> => Private(target);

//(method) Pipeable.pipe<S.Struct<Fields extends S.Struct.Fields>.Field, Annotated<S.Struct.Field, Private>>(this: S.Struct.Field, ab: (_: S.Struct.Field) => Annotated<S.Struct.Field, Private>): Annotated<S.Struct.Field, Private>
