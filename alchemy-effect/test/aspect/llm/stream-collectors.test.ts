import {
  collectAllParts,
  collectAllReasoning,
  collectAllText,
  collectLastReasoning,
  collectLastText,
  collectReasoningByMessage,
  collectTextByMessage,
  collectToolCalls,
  collectToolErrors,
  collectToolResults,
  filterReasoningDeltas,
  filterTextDeltas,
  filterToolCalls,
  filterToolErrors,
  filterToolResults,
  mapReasoningDeltas,
  mapTextDeltas,
  runCollectAllParts,
  runCollectAllReasoning,
  runCollectAllText,
  runCollectLastReasoning,
  runCollectLastText,
  runCollectReasoningByMessage,
  runCollectTextByMessage,
  runCollectToolCalls,
  runCollectToolErrors,
  runCollectToolResults,
  type StreamTextPart,
} from "@/aspect/llm";
import { describe, expect, it } from "vitest";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

// Helper to create mock stream parts
const textStart = (id: string): StreamTextPart => ({
  type: "text-start",
  id,
});

const textDelta = (id: string, text: string): StreamTextPart => ({
  type: "text-delta",
  id,
  text,
});

const textEnd = (id: string): StreamTextPart => ({
  type: "text-end",
  id,
});

const reasoningStart = (id: string): StreamTextPart => ({
  type: "reasoning-start",
  id,
});

const reasoningDelta = (id: string, text: string): StreamTextPart => ({
  type: "reasoning-delta",
  id,
  text,
});

const reasoningEnd = (id: string): StreamTextPart => ({
  type: "reasoning-end",
  id,
});

const toolCall = (
  toolCallId: string,
  toolName: string,
  input: unknown,
): StreamTextPart =>
  ({
    type: "tool-call",
    toolCallId,
    toolName,
    input,
  }) as StreamTextPart;

const toolResult = (
  toolCallId: string,
  toolName: string,
  output: unknown,
): StreamTextPart =>
  ({
    type: "tool-result",
    toolCallId,
    toolName,
    output,
  }) as StreamTextPart;

const toolError = (
  toolCallId: string,
  toolName: string,
  error: unknown,
): StreamTextPart =>
  ({
    type: "tool-error",
    toolCallId,
    toolName,
    error,
  }) as StreamTextPart;

describe("stream-collectors", () => {
  describe("collectAllParts", () => {
    it("collects all parts into an array", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "Hello"),
          textDelta("1", " World"),
          textEnd("1"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectAllParts());

        expect(result).toEqual(parts);
      }).pipe(Effect.runPromise));

    it("handles empty stream", () =>
      Effect.gen(function* () {
        const stream = Stream.fromIterable<StreamTextPart>([]);
        const result = yield* Stream.run(stream, collectAllParts());

        expect(result).toEqual([]);
      }).pipe(Effect.runPromise));
  });

  describe("collectAllText", () => {
    it("concatenates all text-delta parts", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "Hello"),
          textDelta("1", " "),
          textDelta("1", "World"),
          textEnd("1"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectAllText());

        expect(result).toBe("Hello World");
      }).pipe(Effect.runPromise));

    it("concatenates text from multiple messages", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "First"),
          textEnd("1"),
          textStart("2"),
          textDelta("2", "Second"),
          textEnd("2"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectAllText());

        expect(result).toBe("FirstSecond");
      }).pipe(Effect.runPromise));

    it("ignores non-text-delta parts", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "Hello"),
          reasoningStart("r1"),
          reasoningDelta("r1", "thinking..."),
          reasoningEnd("r1"),
          textDelta("1", " World"),
          textEnd("1"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectAllText());

        expect(result).toBe("Hello World");
      }).pipe(Effect.runPromise));

    it("returns empty string for empty stream", () =>
      Effect.gen(function* () {
        const stream = Stream.fromIterable<StreamTextPart>([]);
        const result = yield* Stream.run(stream, collectAllText());

        expect(result).toBe("");
      }).pipe(Effect.runPromise));
  });

  describe("collectTextByMessage", () => {
    it("groups text by message id", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "First"),
          textDelta("1", " message"),
          textEnd("1"),
          textStart("2"),
          textDelta("2", "Second"),
          textDelta("2", " message"),
          textEnd("2"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectTextByMessage());

        expect(result.get("1")).toBe("First message");
        expect(result.get("2")).toBe("Second message");
        expect(result.size).toBe(2);
      }).pipe(Effect.runPromise));

    it("handles interleaved messages", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "A"),
          textStart("2"),
          textDelta("2", "X"),
          textDelta("1", "B"),
          textDelta("2", "Y"),
          textEnd("1"),
          textEnd("2"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectTextByMessage());

        expect(result.get("1")).toBe("AB");
        expect(result.get("2")).toBe("XY");
      }).pipe(Effect.runPromise));
  });

  describe("collectLastText", () => {
    it("returns the last complete text message", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "First"),
          textEnd("1"),
          textStart("2"),
          textDelta("2", "Last"),
          textEnd("2"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectLastText());

        expect(result).toBe("Last");
      }).pipe(Effect.runPromise));

    it("returns undefined for empty stream", () =>
      Effect.gen(function* () {
        const stream = Stream.fromIterable<StreamTextPart>([]);
        const result = yield* Stream.run(stream, collectLastText());

        expect(result).toBeUndefined();
      }).pipe(Effect.runPromise));

    it("returns undefined for stream with no complete messages", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "Incomplete"),
          // No textEnd
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectLastText());

        expect(result).toBeUndefined();
      }).pipe(Effect.runPromise));

    it("only returns complete messages", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "Complete"),
          textEnd("1"),
          textStart("2"),
          textDelta("2", "Incomplete"),
          // No textEnd for message 2
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectLastText());

        expect(result).toBe("Complete");
      }).pipe(Effect.runPromise));
  });

  describe("collectAllReasoning", () => {
    it("concatenates all reasoning-delta parts", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          reasoningStart("1"),
          reasoningDelta("1", "Let me think"),
          reasoningDelta("1", " about this..."),
          reasoningEnd("1"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectAllReasoning());

        expect(result).toBe("Let me think about this...");
      }).pipe(Effect.runPromise));

    it("ignores non-reasoning-delta parts", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("t1"),
          textDelta("t1", "Hello"),
          textEnd("t1"),
          reasoningStart("r1"),
          reasoningDelta("r1", "Thinking"),
          reasoningEnd("r1"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectAllReasoning());

        expect(result).toBe("Thinking");
      }).pipe(Effect.runPromise));
  });

  describe("collectReasoningByMessage", () => {
    it("groups reasoning by message id", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          reasoningStart("1"),
          reasoningDelta("1", "First thought"),
          reasoningEnd("1"),
          reasoningStart("2"),
          reasoningDelta("2", "Second thought"),
          reasoningEnd("2"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectReasoningByMessage());

        expect(result.get("1")).toBe("First thought");
        expect(result.get("2")).toBe("Second thought");
      }).pipe(Effect.runPromise));
  });

  describe("collectLastReasoning", () => {
    it("returns the last complete reasoning message", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          reasoningStart("1"),
          reasoningDelta("1", "First"),
          reasoningEnd("1"),
          reasoningStart("2"),
          reasoningDelta("2", "Last"),
          reasoningEnd("2"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectLastReasoning());

        expect(result).toBe("Last");
      }).pipe(Effect.runPromise));

    it("returns undefined for empty stream", () =>
      Effect.gen(function* () {
        const stream = Stream.fromIterable<StreamTextPart>([]);
        const result = yield* Stream.run(stream, collectLastReasoning());

        expect(result).toBeUndefined();
      }).pipe(Effect.runPromise));
  });

  describe("collectToolCalls", () => {
    it("collects all tool calls", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          toolCall("tc1", "search", { query: "test" }),
          textStart("1"),
          textDelta("1", "Searching..."),
          textEnd("1"),
          toolCall("tc2", "read", { file: "test.txt" }),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectToolCalls());

        expect(result).toHaveLength(2);
        expect(result[0].toolName).toBe("search");
        expect(result[0].toolCallId).toBe("tc1");
        expect(result[1].toolName).toBe("read");
        expect(result[1].toolCallId).toBe("tc2");
      }).pipe(Effect.runPromise));

    it("returns empty array when no tool calls", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "Hello"),
          textEnd("1"),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectToolCalls());

        expect(result).toEqual([]);
      }).pipe(Effect.runPromise));
  });

  describe("collectToolResults", () => {
    it("collects all tool results", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          toolCall("tc1", "search", { query: "test" }),
          toolResult("tc1", "search", { results: ["a", "b"] }),
          toolCall("tc2", "read", { file: "test.txt" }),
          toolResult("tc2", "read", { content: "file content" }),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectToolResults());

        expect(result).toHaveLength(2);
        expect(result[0].toolName).toBe("search");
        expect(result[0].toolCallId).toBe("tc1");
        expect(result[1].toolName).toBe("read");
        expect(result[1].toolCallId).toBe("tc2");
      }).pipe(Effect.runPromise));
  });

  describe("collectToolErrors", () => {
    it("collects all tool errors", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          toolCall("tc1", "search", { query: "test" }),
          toolError("tc1", "search", new Error("Network error")),
        ];

        const stream = Stream.fromIterable(parts);
        const result = yield* Stream.run(stream, collectToolErrors());

        expect(result).toHaveLength(1);
        expect(result[0].toolName).toBe("search");
        expect(result[0].toolCallId).toBe("tc1");
      }).pipe(Effect.runPromise));
  });

  describe("run helpers", () => {
    it("runCollectAllParts works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [textDelta("1", "Hello")];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectAllParts(stream);
        expect(result).toEqual(parts);
      }).pipe(Effect.runPromise));

    it("runCollectAllText works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [textDelta("1", "Hello")];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectAllText(stream);
        expect(result).toBe("Hello");
      }).pipe(Effect.runPromise));

    it("runCollectTextByMessage works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [textDelta("1", "Hello")];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectTextByMessage(stream);
        expect(result.get("1")).toBe("Hello");
      }).pipe(Effect.runPromise));

    it("runCollectLastText works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          textStart("1"),
          textDelta("1", "Hello"),
          textEnd("1"),
        ];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectLastText(stream);
        expect(result).toBe("Hello");
      }).pipe(Effect.runPromise));

    it("runCollectAllReasoning works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [reasoningDelta("1", "Thinking")];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectAllReasoning(stream);
        expect(result).toBe("Thinking");
      }).pipe(Effect.runPromise));

    it("runCollectReasoningByMessage works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [reasoningDelta("1", "Thinking")];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectReasoningByMessage(stream);
        expect(result.get("1")).toBe("Thinking");
      }).pipe(Effect.runPromise));

    it("runCollectLastReasoning works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          reasoningStart("1"),
          reasoningDelta("1", "Thinking"),
          reasoningEnd("1"),
        ];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectLastReasoning(stream);
        expect(result).toBe("Thinking");
      }).pipe(Effect.runPromise));

    it("runCollectToolCalls works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [toolCall("tc1", "search", {})];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectToolCalls(stream);
        expect(result).toHaveLength(1);
      }).pipe(Effect.runPromise));

    it("runCollectToolResults works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          toolResult("tc1", "search", { data: "test" }),
        ];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectToolResults(stream);
        expect(result).toHaveLength(1);
      }).pipe(Effect.runPromise));

    it("runCollectToolErrors works", () =>
      Effect.gen(function* () {
        const parts: StreamTextPart[] = [
          toolError("tc1", "search", new Error("Failed")),
        ];
        const stream = Stream.fromIterable(parts);
        const result = yield* runCollectToolErrors(stream);
        expect(result).toHaveLength(1);
      }).pipe(Effect.runPromise));
  });

  describe("stream transformers", () => {
    describe("filterTextDeltas", () => {
      it("filters to only text-delta parts", () =>
        Effect.gen(function* () {
          const parts: StreamTextPart[] = [
            textStart("1"),
            textDelta("1", "Hello"),
            reasoningDelta("r1", "thinking"),
            textDelta("1", " World"),
            textEnd("1"),
          ];

          const stream = Stream.fromIterable(parts);
          const result = yield* filterTextDeltas(stream).pipe(
            Stream.runCollect,
          );
          const arr = Chunk.toArray(result);

          expect(arr).toHaveLength(2);
          expect(arr[0].text).toBe("Hello");
          expect(arr[1].text).toBe(" World");
        }).pipe(Effect.runPromise));
    });

    describe("filterReasoningDeltas", () => {
      it("filters to only reasoning-delta parts", () =>
        Effect.gen(function* () {
          const parts: StreamTextPart[] = [
            textDelta("t1", "Hello"),
            reasoningStart("r1"),
            reasoningDelta("r1", "thinking"),
            reasoningDelta("r1", " more"),
            reasoningEnd("r1"),
          ];

          const stream = Stream.fromIterable(parts);
          const result = yield* filterReasoningDeltas(stream).pipe(
            Stream.runCollect,
          );
          const arr = Chunk.toArray(result);

          expect(arr).toHaveLength(2);
          expect(arr[0].text).toBe("thinking");
          expect(arr[1].text).toBe(" more");
        }).pipe(Effect.runPromise));
    });

    describe("filterToolCalls", () => {
      it("filters to only tool-call parts", () =>
        Effect.gen(function* () {
          const parts: StreamTextPart[] = [
            textDelta("1", "Hello"),
            toolCall("tc1", "search", {}),
            toolResult("tc1", "search", {}),
            toolCall("tc2", "read", {}),
          ];

          const stream = Stream.fromIterable(parts);
          const result = yield* filterToolCalls(stream).pipe(Stream.runCollect);
          const arr = Chunk.toArray(result);

          expect(arr).toHaveLength(2);
          expect(arr[0].toolName).toBe("search");
          expect(arr[1].toolName).toBe("read");
        }).pipe(Effect.runPromise));
    });

    describe("filterToolResults", () => {
      it("filters to only tool-result parts", () =>
        Effect.gen(function* () {
          const parts: StreamTextPart[] = [
            toolCall("tc1", "search", {}),
            toolResult("tc1", "search", { data: "result1" }),
            toolCall("tc2", "read", {}),
            toolResult("tc2", "read", { data: "result2" }),
          ];

          const stream = Stream.fromIterable(parts);
          const result = yield* filterToolResults(stream).pipe(
            Stream.runCollect,
          );
          const arr = Chunk.toArray(result);

          expect(arr).toHaveLength(2);
        }).pipe(Effect.runPromise));
    });

    describe("filterToolErrors", () => {
      it("filters to only tool-error parts", () =>
        Effect.gen(function* () {
          const parts: StreamTextPart[] = [
            toolCall("tc1", "search", {}),
            toolError("tc1", "search", new Error("Failed")),
            toolResult("tc2", "read", {}),
          ];

          const stream = Stream.fromIterable(parts);
          const result = yield* filterToolErrors(stream).pipe(
            Stream.runCollect,
          );
          const arr = Chunk.toArray(result);

          expect(arr).toHaveLength(1);
        }).pipe(Effect.runPromise));
    });

    describe("mapTextDeltas", () => {
      it("extracts text from text-delta parts", () =>
        Effect.gen(function* () {
          const parts: StreamTextPart[] = [
            textStart("1"),
            textDelta("1", "Hello"),
            reasoningDelta("r1", "thinking"),
            textDelta("1", " World"),
            textEnd("1"),
          ];

          const stream = Stream.fromIterable(parts);
          const result = yield* mapTextDeltas(stream).pipe(Stream.runCollect);
          const arr = Chunk.toArray(result);

          expect(arr).toEqual(["Hello", " World"]);
        }).pipe(Effect.runPromise));
    });

    describe("mapReasoningDeltas", () => {
      it("extracts text from reasoning-delta parts", () =>
        Effect.gen(function* () {
          const parts: StreamTextPart[] = [
            textDelta("t1", "Hello"),
            reasoningDelta("r1", "thinking"),
            reasoningDelta("r1", " deeply"),
          ];

          const stream = Stream.fromIterable(parts);
          const result = yield* mapReasoningDeltas(stream).pipe(
            Stream.runCollect,
          );
          const arr = Chunk.toArray(result);

          expect(arr).toEqual(["thinking", " deeply"]);
        }).pipe(Effect.runPromise));
    });
  });
});
