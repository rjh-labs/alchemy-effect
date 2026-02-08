import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as App from "../App.ts";
import type { AnyResource } from "../Resource.ts";
import * as State from "../State/index.ts";
import {
  isAllExpr,
  isApplyExpr,
  isEffectExpr,
  isLiteralExpr,
  isPropExpr,
  isRefExpr,
  isResourceExpr,
} from "./Expr.ts";
import type { Output } from "./Output.ts";

export class MissingSourceError extends Data.TaggedError("MissingSourceError")<{
  message: string;
  srcId: string;
}> {}

export class InvalidReferenceError extends Data.TaggedError(
  "InvalidReferenceError",
)<{
  message: string;
  stack: string;
  stage: string;
  resourceId: string;
}> {}

export const evaluate: <A, Upstream extends AnyResource, Req>(
  expr: Output<A, Upstream, Req>,
  upstream: {
    [Id in Upstream["id"]]: Extract<Upstream, { id: Id }>["attr"];
  },
) => Effect.Effect<
  A,
  InvalidReferenceError | MissingSourceError,
  State.State
> = (expr, upstream) =>
  Effect.gen(function* () {
    if (isResourceExpr(expr)) {
      const srcId = expr.src.id;
      const src = upstream[srcId as keyof typeof upstream];
      if (!src) {
        // type-safety should prevent this but let the caller decide how to handle it
        return yield* Effect.fail(
          new MissingSourceError({
            message: `Source ${srcId} not found`,
            srcId,
          }),
        );
      }
      return src;
    } else if (isLiteralExpr(expr)) {
      return expr.value;
    } else if (isApplyExpr(expr)) {
      return expr.f(yield* evaluate(expr.expr, upstream));
    } else if (isEffectExpr(expr)) {
      // TODO(sam): the same effect shoudl be memoized so that it's not run multiple times
      return yield* expr.f(yield* evaluate(expr.expr, upstream));
    } else if (isAllExpr(expr)) {
      return yield* Effect.all(expr.outs.map((out) => evaluate(out, upstream)));
    } else if (isPropExpr(expr)) {
      return (yield* evaluate(expr.expr, upstream))?.[expr.identifier];
    } else if (isRefExpr(expr)) {
      const state = yield* State.State;
      const app = yield* App.App;
      const stack = expr.stack ?? app.name;
      const stage = expr.stage ?? app.stage;
      const resource = yield* state.get({
        stack,
        stage,
        resourceId: expr.resourceId,
      });
      if (!resource) {
        return yield* Effect.fail(
          new InvalidReferenceError({
            message: `Reference to '${expr.resourceId}' in stack '${stack}' and stage '${stage}' not found. Have you deployed '${stage}' or '${stack}'?`,
            stack,
            stage,
            resourceId: expr.resourceId,
          }),
        );
      }
      return resource.attr;
    } else if (Array.isArray(expr)) {
      return yield* Effect.all(expr.map((item) => evaluate(item, upstream)));
    } else if (typeof expr === "object" && expr !== null) {
      return Object.fromEntries(
        yield* Effect.all(
          Object.entries(expr).map(([key, value]) =>
            evaluate(value, upstream).pipe(Effect.map((value) => [key, value])),
          ),
        ),
      );
    }
    return expr;
  }) as Effect.Effect<any>;
