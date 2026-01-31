import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import * as Stream from "effect/Stream";
import { Agent, AgentId } from "../agent.ts";
import { LLM } from "../llm/llm.ts";
import { ChatService } from "./service.ts";
import { Thread, ThreadId } from "./thread.ts";

export type TaskId = string;
export const TaskId = S.String.annotations({
  description: "The ID of the task",
});

export class Task extends S.Class<Task>("Task")({
  taskId: TaskId,
  threadId: ThreadId.annotations({
    description: "The thread that the task belongs to",
  }),
  agent: AgentId.annotations({
    description: "The agent that is working on the task",
  }),
}) {}

/** Trigger an Agent to reply in a thread */
export const startTask = Effect.fn("startTask")(function* <A extends Agent>({
  agent,
  thread,
  prompt,
}: {
  agent: A;
  thread: Thread;
  prompt: string;
}) {
  const chat = yield* ChatService;

  const task = yield* chat.createTask({
    threadId: thread.threadId,
    agent,
  });

  const stream = (yield* LLM)
    .stream({
      model: "anthropic/claude-opus-4.5",
      system: "You are a helpful assistant.",
      messages: [],
      tools: [],
    })
    .pipe(Stream.tapSink(chat.sinkTask(task.taskId)));

  return stream;
});

export const interruptTask = Effect.fn("interruptTask")(function* (task: Task) {
  const chat = yield* ChatService;
  yield* chat.interruptTask(task.taskId);
});
