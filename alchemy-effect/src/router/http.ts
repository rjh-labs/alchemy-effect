import type { HttpServerResponse } from "@effect/platform/HttpServerResponse";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { MiddlewareTag, type MiddlewareClass } from "./middleware.ts";
import { Protocol } from "./protocol.ts";
import { defineTrait, Trait, type TraitDef } from "./trait.ts";

export class HttpProtocol extends Protocol("HTTP")<HttpProtocol>() {}

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

export interface Upgrade extends Trait<"Upgrade"> {}
export const Upgrade = defineTrait<Upgrade>("Upgrade", {});

export interface HttpMiddleware<
  T extends Trait,
  Err = never,
  Req = never,
> extends MiddlewareClass<HttpProtocol, T, HttpServerResponse, Err, Req> {}

export namespace middleware {
  export const effect = <T extends TraitDef, Err = never, Req = never>(
    trait: T,
    fn: (context: {
      input: any;
      trait: T["trait"];
      next: Effect.Effect<HttpServerResponse, Err, Req>;
    }) => Effect.Effect<HttpServerResponse, Err, Req>,
  ) =>
    Layer.succeed(
      MiddlewareTag(HttpProtocol, trait)<HttpServerResponse, Err, Req, never>(),
      {
        fn,
      },
    );
}
