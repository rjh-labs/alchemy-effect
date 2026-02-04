import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { describe, expect, test } from "vitest";

import { lastMessageText } from "@/agent/llm/stream-collectors";
import type { StreamTextPart } from "@/agent/llm/stream-text-part";

// Helper to create stream parts for testing
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

const toolCall = (toolCallId: string, toolName: string): StreamTextPart => ({
  type: "tool-call",
  toolCallId,
  toolName,
  input: {},
});

const runCollector = (parts: StreamTextPart[]) =>
  Effect.runSync(Stream.fromIterable(parts).pipe(Stream.run(lastMessageText)));

describe("lastMessageText", () => {
  describe("empty and incomplete streams", () => {
    test("returns undefined for empty stream", () => {
      const result = runCollector([]);
      expect(result).toBeUndefined();
    });

    test("returns undefined when no text-end is received", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Hello"),
        textDelta("msg-1", " World"),
        // No text-end
      ]);
      expect(result).toBeUndefined();
    });

    test("returns undefined for only text-start", () => {
      const result = runCollector([textStart("msg-1")]);
      expect(result).toBeUndefined();
    });
  });

  describe("single complete message", () => {
    test("collects single complete text message", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Hello"),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Hello");
    });

    test("collects multiple text deltas into single message", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Hello"),
        textDelta("msg-1", " "),
        textDelta("msg-1", "World"),
        textDelta("msg-1", "!"),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Hello World!");
    });

    test("handles empty text deltas", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", ""),
        textDelta("msg-1", "Hello"),
        textDelta("msg-1", ""),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Hello");
    });

    test("returns empty string for complete message with no deltas", () => {
      const result = runCollector([textStart("msg-1"), textEnd("msg-1")]);
      expect(result).toBe("");
    });
  });

  describe("multiple messages", () => {
    test("returns the last complete message", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "First"),
        textEnd("msg-1"),
        textStart("msg-2"),
        textDelta("msg-2", "Second"),
        textEnd("msg-2"),
      ]);
      expect(result).toBe("Second");
    });

    test("returns last complete message when final message is incomplete", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Complete"),
        textEnd("msg-1"),
        textStart("msg-2"),
        textDelta("msg-2", "Incomplete"),
        // No text-end for msg-2
      ]);
      expect(result).toBe("Complete");
    });

    test("handles three consecutive complete messages", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "First"),
        textEnd("msg-1"),
        textStart("msg-2"),
        textDelta("msg-2", "Second"),
        textEnd("msg-2"),
        textStart("msg-3"),
        textDelta("msg-3", "Third"),
        textEnd("msg-3"),
      ]);
      expect(result).toBe("Third");
    });
  });

  describe("message ID tracking", () => {
    test("ignores text-delta with mismatched ID", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Hello"),
        textDelta("msg-2", " Ignored"), // Different ID - should be ignored
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Hello");
    });

    test("ignores text-end with mismatched ID", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Hello"),
        textEnd("msg-2"), // Different ID - should be ignored
      ]);
      // Message is not complete because text-end had wrong ID
      expect(result).toBeUndefined();
    });

    test("new text-start resets accumulator", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "First"),
        // No text-end, then new message starts
        textStart("msg-2"),
        textDelta("msg-2", "Second"),
        textEnd("msg-2"),
      ]);
      expect(result).toBe("Second");
    });
  });

  describe("ignores other part types", () => {
    test("ignores reasoning parts", () => {
      const result = runCollector([
        reasoningStart("r-1"),
        reasoningDelta("r-1", "thinking..."),
        reasoningEnd("r-1"),
        textStart("msg-1"),
        textDelta("msg-1", "Hello"),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Hello");
    });

    test("ignores tool calls interspersed with text", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Before"),
        toolCall("tc-1", "someTool"),
        textDelta("msg-1", " After"),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Before After");
    });

    test("handles stream with only non-text parts", () => {
      const result = runCollector([
        reasoningStart("r-1"),
        reasoningDelta("r-1", "thinking..."),
        reasoningEnd("r-1"),
        toolCall("tc-1", "someTool"),
      ]);
      expect(result).toBeUndefined();
    });

    test("collects text after tool calls", () => {
      const result = runCollector([
        toolCall("tc-1", "firstTool"),
        toolCall("tc-2", "secondTool"),
        textStart("msg-1"),
        textDelta("msg-1", "Final response"),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Final response");
    });
  });

  describe("complex scenarios", () => {
    test("interleaved reasoning and text", () => {
      const result = runCollector([
        reasoningStart("r-1"),
        reasoningDelta("r-1", "Let me think..."),
        reasoningEnd("r-1"),
        textStart("msg-1"),
        textDelta("msg-1", "Here's my answer"),
        textEnd("msg-1"),
        reasoningStart("r-2"),
        reasoningDelta("r-2", "Actually..."),
        reasoningEnd("r-2"),
        textStart("msg-2"),
        textDelta("msg-2", "Updated answer"),
        textEnd("msg-2"),
      ]);
      expect(result).toBe("Updated answer");
    });

    test("multiline text content", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Line 1\n"),
        textDelta("msg-1", "Line 2\n"),
        textDelta("msg-1", "Line 3"),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Line 1\nLine 2\nLine 3");
    });

    test("unicode and special characters", () => {
      const result = runCollector([
        textStart("msg-1"),
        textDelta("msg-1", "Hello 世界 🌍 "),
        textDelta("msg-1", "émojis: 👋🏽"),
        textEnd("msg-1"),
      ]);
      expect(result).toBe("Hello 世界 🌍 émojis: 👋🏽");
    });
  });
});
