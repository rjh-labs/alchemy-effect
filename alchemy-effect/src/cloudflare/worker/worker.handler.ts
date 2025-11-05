import type {
  ExecutionContext,
  ExportedHandler,
  Request,
  Response,
} from "@cloudflare/workers-types";
import type { Capability } from "alchemy-effect";
import * as Effect from "effect/Effect";
import { CloudflareEnv } from "../env";

type Handler = (
  request: Request,
  env: unknown,
  ctx: ExecutionContext,
) => Effect.Effect<Response, any, never>;
type HandlerFactory<H extends Handler, Req = Capability> = Effect.Effect<
  H,
  any,
  Req
>;

export const toHandler = <H extends Handler>(
  factory: HandlerFactory<H, Capability>,
) => {
  return {
    fetch: async (request, env, ctx) => {
      const fetchEffect = await Effect.runPromise(
        (factory as HandlerFactory<H, never>).pipe(
          Effect.provideService(CloudflareEnv, env as Record<string, unknown>),
        ),
      );
      return await Effect.runPromise(fetchEffect(request, env, ctx), {
        signal: request.signal as AbortSignal,
      });
    },
  } satisfies ExportedHandler;
};
