import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
// oxlint-disable no-unused-expressions
import * as S from "effect/Schema";
import { type AnyClass } from "../schema.ts";
import * as Http from "./http.ts";
import * as Router from "./index.ts";
import { Protocol } from "./protocol.ts";
import type { RouteProps } from "./route.ts";
import { defineTrait, Trait } from "./trait.ts";

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

export class Ec2Query extends Protocol("Ec2Query")<Ec2Query>() {}

export const ec2QueryLive = Layer.effect(
  Ec2Query,
  Effect.gen(function* () {
    // yield* MyDep;
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

export interface Authorized extends Trait<"Authorized", [UnauthorizedError]> {}
export const Authorized = defineTrait<Authorized>("Authorized", {
  errors: [UnauthorizedError],
});
export const Authorization = S.String.pipe(Http.Header("Authorization"));

export const authenticatedHttp = Http.middleware.effect(
  Authenticated,
  Effect.fn(function* ({ trait, input, next }) {
    trait;
    input;
    next;
    return undefined!;
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

export class MyRequest extends Router.Request("MyRequest", {
  authorization: Authorization,
}) {}

export class MyResponse extends Router.Response("MyResponse", {
  key: S.String,
}) {}

const createRoute = <
  const Name extends string,
  Input extends AnyClass,
  Output extends AnyClass,
>(
  name: Name,
  props: RouteProps<Input, Output, never, never>,
) => Router.Route(name, props).pipe(Authenticated(), Authorized);

// Route<,,, Authenticate | Authorized>
export const createEC2Instance = createRoute("CreateEC2Instance", {
  // this ...
  input: MyRequest, // it can provide additional requirements
  // "you must provide the AuthService, but middleware chain is already formed?"
  output: MyResponse,
  errors: [UnauthorizedError],
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
