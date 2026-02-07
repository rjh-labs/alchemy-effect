import * as Context from "effect/Context";
import * as Route from "./Route.ts";

export const Tag = <
  Name extends string,
  Routes extends readonly Route.AnyRoute[],
>(
  name: Name,
) => Context.Tag(name)<HttpEndpoint, HttpEndpoint>();
