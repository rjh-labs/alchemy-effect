import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import type { StreamTextPart } from "./stream-text-part.ts";

// Extract specific part types from the StreamTextPart union
export type TextDeltaPart = Extract<StreamTextPart, { type: "text-delta" }>;
export type TextStartPart = Extract<StreamTextPart, { type: "text-start" }>;
export type TextEndPart = Extract<StreamTextPart, { type: "text-end" }>;
export type ReasoningDeltaPart = Extract<
  StreamTextPart,
  { type: "reasoning-delta" }
>;
export type ReasoningStartPart = Extract<
  StreamTextPart,
  { type: "reasoning-start" }
>;
export type ReasoningEndPart = Extract<
  StreamTextPart,
  { type: "reasoning-end" }
>;
export type ToolCallPart = Extract<StreamTextPart, { type: "tool-call" }>;
export type ToolResultPart = Extract<StreamTextPart, { type: "tool-result" }>;
export type ToolErrorPart = Extract<StreamTextPart, { type: "tool-error" }>;

/**
 * Creates a sink that collects all parts from a stream into an array.
 *
 * @example
 * ```typescript
 * const parts = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectAllParts())
 * );
 * ```
 */
export const collectAllParts = (): Sink.Sink<
  StreamTextPart[],
  StreamTextPart
> => Sink.collectAll<StreamTextPart>().pipe(Sink.map(Chunk.toArray));

/**
 * Creates a sink that collects all text-delta parts from a stream and
 * concatenates them into a single string.
 *
 * @example
 * ```typescript
 * const text = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectAllText())
 * );
 * ```
 */
export const collectAllText = (): Sink.Sink<string, StreamTextPart> =>
  Sink.foldLeft("", (acc: string, part: StreamTextPart) =>
    part.type === "text-delta" ? acc + part.text : acc,
  );

/**
 * Creates a sink that collects all text-delta parts grouped by message id.
 * Returns a Map from message id to concatenated text.
 *
 * @example
 * ```typescript
 * const textByMessage = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectTextByMessage())
 * );
 * for (const [id, text] of textByMessage) {
 *   console.log(`Message ${id}: ${text}`);
 * }
 * ```
 */
export const collectTextByMessage = (): Sink.Sink<
  Map<string, string>,
  StreamTextPart
> =>
  Sink.foldLeft(
    new Map<string, string>(),
    (acc: Map<string, string>, part: StreamTextPart) => {
      if (part.type === "text-delta") {
        const existing = acc.get(part.id) ?? "";
        acc.set(part.id, existing + part.text);
      }
      return acc;
    },
  );

/**
 * Creates a sink that collects the text from the last complete text message.
 * A complete message is one that has received a text-end event.
 * Returns undefined if no complete text messages are present.
 *
 * @example
 * ```typescript
 * const lastText = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectLastText())
 * );
 * if (lastText) {
 *   console.log(`Last message: ${lastText}`);
 * }
 * ```
 */
export const collectLastText = (): Sink.Sink<
  string | undefined,
  StreamTextPart
> =>
  Sink.foldLeft(
    {
      currentId: undefined as string | undefined,
      text: "",
      lastComplete: undefined as string | undefined,
    },
    (acc, part: StreamTextPart) => {
      if (part.type === "text-start") {
        return { currentId: part.id, text: "", lastComplete: acc.lastComplete };
      }
      if (part.type === "text-delta" && acc.currentId === part.id) {
        return { ...acc, text: acc.text + part.text };
      }
      if (part.type === "text-end" && acc.currentId === part.id) {
        return { ...acc, lastComplete: acc.text };
      }
      return acc;
    },
  ).pipe(Sink.map((acc) => acc.lastComplete));

/**
 * Creates a sink that collects all reasoning-delta parts from a stream and
 * concatenates them into a single string.
 *
 * @example
 * ```typescript
 * const reasoning = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectAllReasoning())
 * );
 * ```
 */
export const collectAllReasoning = (): Sink.Sink<string, StreamTextPart> =>
  Sink.foldLeft("", (acc: string, part: StreamTextPart) =>
    part.type === "reasoning-delta" ? acc + part.text : acc,
  );

/**
 * Creates a sink that collects all reasoning-delta parts grouped by message id.
 * Returns a Map from message id to concatenated reasoning text.
 *
 * @example
 * ```typescript
 * const reasoningByMessage = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectReasoningByMessage())
 * );
 * ```
 */
export const collectReasoningByMessage = (): Sink.Sink<
  Map<string, string>,
  StreamTextPart
> =>
  Sink.foldLeft(
    new Map<string, string>(),
    (acc: Map<string, string>, part: StreamTextPart) => {
      if (part.type === "reasoning-delta") {
        const existing = acc.get(part.id) ?? "";
        acc.set(part.id, existing + part.text);
      }
      return acc;
    },
  );

/**
 * Creates a sink that collects the reasoning from the last complete reasoning message.
 * Returns undefined if no complete reasoning messages are present.
 *
 * @example
 * ```typescript
 * const lastReasoning = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectLastReasoning())
 * );
 * ```
 */
export const collectLastReasoning = (): Sink.Sink<
  string | undefined,
  StreamTextPart
> =>
  Sink.foldLeft(
    {
      currentId: undefined as string | undefined,
      text: "",
      lastComplete: undefined as string | undefined,
    },
    (acc, part: StreamTextPart) => {
      if (part.type === "reasoning-start") {
        return { currentId: part.id, text: "", lastComplete: acc.lastComplete };
      }
      if (part.type === "reasoning-delta" && acc.currentId === part.id) {
        return { ...acc, text: acc.text + part.text };
      }
      if (part.type === "reasoning-end" && acc.currentId === part.id) {
        return { ...acc, lastComplete: acc.text };
      }
      return acc;
    },
  ).pipe(Sink.map((acc) => acc.lastComplete));

/**
 * Creates a sink that collects all tool-call parts from the stream.
 *
 * @example
 * ```typescript
 * const toolCalls = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectToolCalls())
 * );
 * for (const call of toolCalls) {
 *   console.log(`Tool: ${call.toolName}, Input: ${JSON.stringify(call.input)}`);
 * }
 * ```
 */
export const collectToolCalls = (): Sink.Sink<ToolCallPart[], StreamTextPart> =>
  Sink.foldLeft(
    [] as ToolCallPart[],
    (acc: ToolCallPart[], part: StreamTextPart) => {
      if (part.type === "tool-call") {
        return [...acc, part];
      }
      return acc;
    },
  );

/**
 * Creates a sink that collects all tool-result parts from the stream.
 *
 * @example
 * ```typescript
 * const toolResults = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectToolResults())
 * );
 * for (const result of toolResults) {
 *   console.log(`Tool: ${result.toolName}, Output: ${JSON.stringify(result.output)}`);
 * }
 * ```
 */
export const collectToolResults = (): Sink.Sink<
  ToolResultPart[],
  StreamTextPart
> =>
  Sink.foldLeft(
    [] as ToolResultPart[],
    (acc: ToolResultPart[], part: StreamTextPart) => {
      if (part.type === "tool-result") {
        return [...acc, part];
      }
      return acc;
    },
  );

/**
 * Creates a sink that collects all tool-error parts from the stream.
 *
 * @example
 * ```typescript
 * const toolErrors = yield* llm.stream({ ... }).pipe(
 *   Stream.run(collectToolErrors())
 * );
 * ```
 */
export const collectToolErrors = (): Sink.Sink<
  ToolErrorPart[],
  StreamTextPart
> =>
  Sink.foldLeft(
    [] as ToolErrorPart[],
    (acc: ToolErrorPart[], part: StreamTextPart) => {
      if (part.type === "tool-error") {
        return [...acc, part];
      }
      return acc;
    },
  );

// ============================================================================
// Run helpers - convenience functions that run a stream with a specific sink
// ============================================================================

/**
 * Runs a stream and collects all parts into an array.
 */
export const runCollectAllParts = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<StreamTextPart[], E, R> =>
  Stream.run(stream, collectAllParts());

/**
 * Runs a stream and collects all text into a single string.
 */
export const runCollectAllText = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<string, E, R> => Stream.run(stream, collectAllText());

/**
 * Runs a stream and collects text grouped by message id.
 */
export const runCollectTextByMessage = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<Map<string, string>, E, R> =>
  Stream.run(stream, collectTextByMessage());

/**
 * Runs a stream and collects the last complete text message.
 */
export const runCollectLastText = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<string | undefined, E, R> =>
  Stream.run(stream, collectLastText());

/**
 * Runs a stream and collects all reasoning into a single string.
 */
export const runCollectAllReasoning = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<string, E, R> => Stream.run(stream, collectAllReasoning());

/**
 * Runs a stream and collects reasoning grouped by message id.
 */
export const runCollectReasoningByMessage = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<Map<string, string>, E, R> =>
  Stream.run(stream, collectReasoningByMessage());

/**
 * Runs a stream and collects the last complete reasoning message.
 */
export const runCollectLastReasoning = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<string | undefined, E, R> =>
  Stream.run(stream, collectLastReasoning());

/**
 * Runs a stream and collects all tool calls.
 */
export const runCollectToolCalls = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<ToolCallPart[], E, R> =>
  Stream.run(stream, collectToolCalls());

/**
 * Runs a stream and collects all tool results.
 */
export const runCollectToolResults = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<ToolResultPart[], E, R> =>
  Stream.run(stream, collectToolResults());

/**
 * Runs a stream and collects all tool errors.
 */
export const runCollectToolErrors = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Effect.Effect<ToolErrorPart[], E, R> =>
  Stream.run(stream, collectToolErrors());

// ============================================================================
// Stream transformers - filter and map functions for stream pipelines
// ============================================================================

/**
 * Filters the stream to only include text-delta parts.
 */
export const filterTextDeltas = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Stream.Stream<TextDeltaPart, E, R> =>
  Stream.filter(
    stream,
    (part): part is TextDeltaPart => part.type === "text-delta",
  );

/**
 * Filters the stream to only include reasoning-delta parts.
 */
export const filterReasoningDeltas = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Stream.Stream<ReasoningDeltaPart, E, R> =>
  Stream.filter(
    stream,
    (part): part is ReasoningDeltaPart => part.type === "reasoning-delta",
  );

/**
 * Filters the stream to only include tool-call parts.
 */
export const filterToolCalls = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Stream.Stream<ToolCallPart, E, R> =>
  Stream.filter(
    stream,
    (part): part is ToolCallPart => part.type === "tool-call",
  );

/**
 * Filters the stream to only include tool-result parts.
 */
export const filterToolResults = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Stream.Stream<ToolResultPart, E, R> =>
  Stream.filter(
    stream,
    (part): part is ToolResultPart => part.type === "tool-result",
  );

/**
 * Filters the stream to only include tool-error parts.
 */
export const filterToolErrors = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Stream.Stream<ToolErrorPart, E, R> =>
  Stream.filter(
    stream,
    (part): part is ToolErrorPart => part.type === "tool-error",
  );

/**
 * Maps over text-delta parts, extracting just the text content.
 */
export const mapTextDeltas = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Stream.Stream<string, E, R> =>
  Stream.filterMap(stream, (part) =>
    part.type === "text-delta" ? Option.some(part.text) : Option.none(),
  );

/**
 * Maps over reasoning-delta parts, extracting just the text content.
 */
export const mapReasoningDeltas = <E, R>(
  stream: Stream.Stream<StreamTextPart, E, R>,
): Stream.Stream<string, E, R> =>
  Stream.filterMap(stream, (part) =>
    part.type === "reasoning-delta" ? Option.some(part.text) : Option.none(),
  );
