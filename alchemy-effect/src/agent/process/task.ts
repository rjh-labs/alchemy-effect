import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import * as Stream from "effect/Stream";
import { ServiceTag } from "../../service-tag.ts";
import { Agent, AgentId } from "../agent.ts";
import { Chat } from "../chat/service.ts";
import { Thread, ThreadId } from "../chat/thread.ts";
import { LLM } from "../llm/llm.ts";

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

export class CreateTaskRequest extends S.Class<CreateTaskRequest>(
  "CreateTaskRequest",
)({
  threadId: ThreadId,
  agentId: AgentId,
}) {}

export class Tasks extends ServiceTag("Tasks")<
  Tasks,
  {
    createTask: (input: CreateTaskRequest) => Effect.Effect<Task>;
  }
>() {}

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
  const task = yield* Chat.createTask({
    threadId: thread.threadId,
    agentId: agent.id,
  });

  const stream = LLM.stream({
    model: "anthropic/claude-opus-4.5",
    system: "You are a helpful assistant.",
    messages: [{ role: "user", content: prompt }],
    tools: [],
  }).pipe(Stream.tapSink(Chat.sinkTask(task.taskId)));

  return {
    task,
    stream,
  };
});
