import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import type { YieldWrap } from "effect/Utils";
import { defineAspect, type Aspect } from "../aspect.ts";
import { Function } from "../schema.ts";
import type { Parameters } from "./parameter.ts";
import type { Result } from "./result.ts";

export const isTool = (artifact: any): artifact is Tool =>
  artifact?.type === "tool";

export class ToolProps extends S.Class<ToolProps>("ToolProps")({
  alias: S.optional(Function<(model: string) => string | undefined>),
}) {}

export type ToolHandler<References extends any[], Err = any, Req = any> = (
  params: Parameters.Of<References>,
) => Effect.Effect<Result.Of<References>, Err, Req>;

export type Tool<
  ID extends string = string,
  References extends any[] = any[],
  Props extends ToolProps = ToolProps,
  Handler extends ToolHandler<References> = ToolHandler<References>,
> = Aspect<Tool, "tool", ID, References, Props, Handler>;

export const Tool = defineAspect<
  <const ID extends string, Props extends ToolProps = ToolProps>(
    id: ID,
    props?: Props,
  ) => <const References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ) => <Eff extends YieldWrap<Effect.Effect<any, any, any>>>(
    handler: (
      input: Parameters.Of<References>,
    ) => Generator<Eff, NoInfer<Result.Of<References>>, never>,
  ) => Aspect<
    Tool,
    "tool",
    ID,
    References,
    Props,
    (
      input: Parameters.Of<References>,
    ) => Effect.Effect<
      NoInfer<Result.Of<References>>,
      [Eff] extends [never]
        ? never
        : [Eff] extends [YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>]
          ? E
          : never,
      [Eff] extends [never]
        ? never
        : [Eff] extends [YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>]
          ? R
          : never
    >
  >
>("tool", ToolProps);
