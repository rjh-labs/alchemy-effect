import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import type { YieldWrap } from "effect/Utils";
import type { IsNever } from "../util.ts";
import type { Aspect } from "./aspect.ts";

export type IO<
  Type extends string,
  ID extends string,
  S extends S.Struct.Field = typeof S.String,
  References extends any[] = any[],
> = {
  type: Type;
  id: ID;
  schema: S;
  template: TemplateStringsArray;
  references: References;
};

export const io =
  <Type extends string>(type: Type) =>
  <ID extends string, S extends S.Struct.Field = typeof S.String>(
    ID: ID,
    schema: S = S.String as any as S,
  ) =>
  <const References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ) => ({
    type,
    id: ID,
    schema,
    template,
    references,
  });

export const isParam = (artifact: any): artifact is Param =>
  artifact?.type === "param";

export type Param<
  ID extends string = string,
  S extends S.Struct.Field = typeof S.String,
  References extends any[] = any[],
> = IO<"param", ID, S, References>;

export declare namespace Param {
  export type Of<
    References extends any[],
    Fields extends S.Struct.Fields = {},
  > = References extends []
    ? S.Struct<Fields>["Type"]
    : References extends [infer Artifact, ...infer Rest]
      ? Artifact extends Param<infer Name extends string, infer Field, any[]>
        ? Param.Of<Rest, Fields & { [name in Name]: Field }>
        : Param.Of<Rest, Fields>
      : [];
}

export const param = io("param");

export const isResult = (artifact: any): artifact is Result =>
  artifact?.type === "result";

export type Result<
  ID extends string = string,
  S extends S.Schema<any> = typeof S.String,
  References extends any[] = any[],
> = IO<"result", ID, S, References>;

export declare namespace Result {
  export type Of<
    References extends readonly any[],
    Outputs = never,
    Primitives = never,
  > = References extends []
    ? Outputs | Primitives extends never
      ? void
      : Outputs | Primitives
    : References extends readonly [infer Ref, ...infer Rest]
      ? Ref extends {
          type: "result";
          schema: infer Schema;
          id: infer Name extends string;
        }
        ? Result.Of<
            Rest,
            (IsNever<Outputs> extends true ? {} : Outputs) & {
              [name in Name]: S.Schema.Type<Schema>;
            },
            Primitives
          >
        : Ref extends S.Schema<infer T>
          ? Result.Of<Rest, Outputs, Primitives | T>
          : Result.Of<Rest, Outputs, Primitives>
      : never;
}

export const result = io("result");

export const isTool = (artifact: any): artifact is Tool =>
  artifact?.type === "tool";

export interface Tool<
  ID extends string = string,
  Input = any,
  Output = any,
  References extends any[] = any[],
  Err = any,
  Req = any,
> extends Aspect<"tool", ID, References> {
  readonly input: S.Schema<Input>;
  readonly output: S.Schema<Output>;
  readonly alias: ((model: string) => string | undefined) | undefined;
  readonly execute: (
    ...args: void extends Input ? [] : [Input]
  ) => Effect.Effect<Output, Err, Req>;
  /** @internal phantom */
  readonly Req: Req;
  /** @internal phantom */
  readonly Err: Err;
}

export const Tool =
  <ID extends string>(
    id: ID,
    options?: {
      alias?: (model: string) => string | undefined;
    },
  ) =>
  <References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ) =>
  <Eff extends YieldWrap<Effect.Effect<any, any, any>>>(
    execute: (
      input: Param.Of<References>,
    ) => Generator<Eff, NoInfer<Result.Of<References>>, never>,
  ): Tool<
    ID,
    Param.Of<References>,
    Result.Of<References>,
    References,
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
  > =>
    ({
      type: "tool",
      id,
      template,
      references,
      alias: options?.alias,
      input: deriveSchema(references, isParam) as any as S.Schema<
        Param.Of<References>
      >,
      output: (deriveSchema(references, isResult) ?? S.Any) as any as S.Schema<
        Result.Of<References>
      >,
      execute: Effect.fn(id)(execute),
    }) as any;

const deriveSchema = (
  references: any[],
  predicate: (artifact: any) => boolean,
) => {
  const matches = references.filter(predicate);
  if (matches.length === 0) {
    return undefined;
  }
  return S.Struct(
    Object.fromEntries(
      references.filter(predicate).map((artifact) => {
        // Get the description from the template if available
        const description = artifact.template
          ? artifact.template.join("").trim()
          : undefined;
        // Annotate the schema with the description if present
        const schema = description
          ? artifact.schema.annotations({ description })
          : artifact.schema;
        return [artifact.id, schema];
      }),
    ),
  );
};

const command = param("command")`The command to execute`;

export class bash extends Tool("bash")`
A tool that can run bash ${command}s returning a ${S.String}.
`(function* ({ command }) {
  console.log(command);
  return "";
}) {}
