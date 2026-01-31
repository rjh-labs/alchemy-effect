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

export const isInput = (artifact: any): artifact is Input =>
  artifact?.type === "input";

export type Input<
  ID extends string = string,
  S extends S.Struct.Field = typeof S.String,
  References extends any[] = any[],
> = IO<"input", ID, S, References>;

export declare namespace Input {
  export type Of<
    References extends any[],
    Fields extends S.Struct.Fields = {},
  > = References extends []
    ? S.Struct<Fields>["Type"]
    : References extends [infer Artifact, ...infer Rest]
      ? Artifact extends Input<infer Name extends string, infer Field, any[]>
        ? Input.Of<Rest, Fields & { [name in Name]: Field }>
        : Input.Of<Rest, Fields>
      : [];
}

export const input = io("input");

export const isOutput = (artifact: any): artifact is Output =>
  artifact?.type === "output";

export type Output<
  ID extends string = string,
  S extends S.Schema<any> = typeof S.String,
  References extends any[] = any[],
> = IO<"output", ID, S, References>;

export declare namespace Output {
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
          type: "output";
          schema: infer Schema;
          id: infer Name extends string;
        }
        ? Output.Of<
            Rest,
            (IsNever<Outputs> extends true ? {} : Outputs) & {
              [name in Name]: S.Schema.Type<Schema>;
            },
            Primitives
          >
        : Ref extends S.Schema<infer T>
          ? Output.Of<Rest, Outputs, Primitives | T>
          : Output.Of<Rest, Outputs, Primitives>
      : never;
}

export const output = io("output");
const references = [
  output("output")`The output of the tool`,
  output("error")`The output of the tool`,
  S.String,
] as const;

type _ = Output.Of<typeof references>;

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
      input: Input.Of<References>,
    ) => Generator<Eff, NoInfer<Output.Of<References>>, never>,
  ): Tool<
    ID,
    Input.Of<References>,
    Output.Of<References>,
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
      input: deriveSchema(references, isInput) as any as S.Schema<
        Input.Of<References>
      >,
      output: (deriveSchema(references, isOutput) ?? S.Any) as any as S.Schema<
        Output.Of<References>
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

const command = input("command")`The command to execute`;

export class bash extends Tool("bash")`
A tool that can run bash ${command}s returning a ${S.String}.
`(function* ({ command }) {
  console.log(command);
  return "";
}) {}
