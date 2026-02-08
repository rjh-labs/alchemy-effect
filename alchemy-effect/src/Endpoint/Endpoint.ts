import * as Context from "effect/Context";
import type { ContentType } from "../ContentType.ts";
import * as Route from "../Route.ts";
import type { Protocol } from "./Protocol.ts";

export interface EndpointProps<
  Routes extends readonly Route.AnyRoute[],
  Protocols extends Protocol[],
  Formats extends ContentType[],
> {
  routes: Routes;
  protocols: Protocols;
  formats: Formats;
}

export interface Endpoint<
  Name extends string = string,
  Routes extends readonly Route.AnyRoute[] = readonly Route.AnyRoute[],
  Protocols extends Protocol[] = Protocol[],
  Formats extends ContentType[] = ContentType[],
> extends Context.TagClass<
  Endpoint<Name, Routes, Protocols, Formats>,
  Name,
  {
    // TODO
  }
> {}

export const Endpoint = <
  Name extends string,
  const Routes extends readonly Route.AnyRoute[],
>(
  name: Name,
  props: EndpointProps<Routes>,
) => Context.Tag(name)<HttpEndpoint, HttpEndpoint>();
