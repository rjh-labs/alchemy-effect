import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import type { YieldWrap } from "effect/Utils";
import type { IsNever } from "../util.ts";
import { defineAspect, type Aspect } from "./aspect.ts";

export type IO<
  Type extends string,
  ID extends string,
  S extends S.Struct.Field = typeof S.String,
  References extends any[] = any[],
> = Aspect<IO<Type, ID, S, References>, Type, ID, References>;

export const io =
  <Type extends string>(type: Type) =>
  <ID extends string, S extends S.Struct.Field = typeof S.String>(
    ID: ID,
    schema: S = S.String as any as S,
  ) =>
  <const References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ): IO<Type, ID, S, References> => ({
    type,
    id: ID,
    schema,
    template,
    references,
  });

export const isParam = (artifact: any): artifact is Input =>
  artifact?.type === "param";

export type Input<
  ID extends string = string,
  S extends S.Struct.Field = typeof S.String,
  References extends any[] = any[],
> = IO<"param", ID, S, References>;

export declare namespace Params {
  export type Of<
    References extends any[],
    Fields extends S.Struct.Fields = {},
  > = References extends []
    ? S.Struct<Fields>["Type"]
    : References extends [infer Artifact, ...infer Rest]
      ? Artifact extends Input<infer Name extends string, infer Field, any[]>
        ? Params.Of<Rest, Fields & { [name in Name]: Field }>
        : Params.Of<Rest, Fields>
      : [];
}

export const isResult = (artifact: any): artifact is Output =>
  artifact?.type === "result";

export type Output<
  ID extends string = string,
  S extends S.Schema<any> = typeof S.String,
  References extends any[] = any[],
> = IO<"result", ID, S, References>;

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
          type: "result";
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

export const isTool = (artifact: any): artifact is Tool =>
  artifact?.type === "tool";

export interface Tool<
  ID extends string = string,
  Input = any,
  Output = any,
  References extends any[] = any[],
  Err = any,
  Req = any,
> extends Aspect<Tool, "tool", ID, References> {
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

export function Tool<ID extends string>(
  id: ID,
  options?: {
    alias?: (model: string) => string | undefined;
  },
) {
  return <References extends any[]>(
    template: TemplateStringsArray,
    ...references: References
  ) =>
    <Eff extends YieldWrap<Effect.Effect<any, any, any>>>(
      execute: (
        input: Params.Of<References>,
      ) => Generator<Eff, NoInfer<Output.Of<References>>, never>,
    ): Tool<
      ID,
      Params.Of<References>,
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
      Object.assign(class {}, {
        type: "tool",
        id,
        template,
        references,
        alias: options?.alias,
        input: deriveSchema(references, isParam) as any as S.Schema<
          Params.Of<References>
        >,
        output: (deriveSchema(references, isResult) ??
          S.Any) as any as S.Schema<Output.Of<References>>,
        execute: Effect.fn(id)(execute),
      }) as any;
}

export namespace Tool {
  export const input = io("input");
  // export const output = io("output");

  export const Schema = S.suspend((): S.Schema<S.Schema<any>> => S.Any);

  export class OutputProps extends S.Class<OutputProps>("OutputProps")({
    schema: Schema,
  }) {}

  export interface Output<
    ID extends string = string,
    References extends any[] = any[],
    Props extends OutputProps = OutputProps,
  > extends Aspect<Output, "output", ID, References, Props> {}

  export const output = defineAspect<
    <
      const Name extends string,
      Props extends OutputProps = { schema: typeof S.String },
    >(
      name: Name,
      props?: Props,
    ) => <References extends any[]>(
      template: TemplateStringsArray,
      ...references: References
    ) => Output<Name, References, Props>
  >("output", OutputProps);

  output("stdout");
}

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
