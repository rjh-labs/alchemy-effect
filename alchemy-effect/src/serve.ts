import type { HttpServerRequest } from "@effect/platform/HttpServerRequest";
import type { HttpServerResponse } from "@effect/platform/HttpServerResponse";
import * as Effect from "effect/Effect";
import type { ServiceDef } from "./service.ts";

export const serve = <const ID extends string, Err = never, Req = never>(
  id: ID,
  {
    fetch,
  }: {
    fetch: (
      request: HttpServerRequest,
    ) => Effect.Effect<HttpServerResponse, Err, Req>;
  },
): ServiceDef<
  ID,
  (request: HttpServerRequest) => Effect.Effect<HttpServerResponse, Err, Req>
> => class {};
