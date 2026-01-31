import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import { AgentId } from "../agent.ts";
import { LLM } from "../llm/llm.ts";
import { input, Tool } from "../tool.ts";
import { ChatService } from "./service.ts";
import { startTask } from "./task.ts";

export type ThreadId = string;
export const ThreadId = S.String.annotations({
  description: "The ID of the thread",
});

export class Thread extends S.Class<Thread>("Thread")({
  threadId: ThreadId,
  participants: S.Array(S.String).annotations({
    description: "The agent participants in the thread",
  }),
  messages: S.Array(S.String).annotations({
    description: "The messages in the thread",
  }),
  parent: S.optional(S.suspend((): S.Schema<Thread> => Thread)),
}) {}

/**
 * Called whenever a message is sent by a user to a Thread.
 *
 * This uses an LLM to choose which agents should respond to the message.
 */
export const driveThread = Effect.fn("driveThread")(function* (thread: Thread) {
  const chat = yield* ChatService;
  const llm = yield* LLM;

  const code = input("code")`Code to evaluate.`;
  const evaluate = Tool("eval")`
Evaluates ${code} in the context of a Thread.
Use this tool to explore the Chat environment and find relevant information.`(
    function* ({ code }) {
      // oxlint-disable-next-line no-eval
      return eval(code);
    },
  );

  const threadId = input("threadId", ThreadId)`The Thread to reply to.`;
  const agentId = input(
    "agentId",
    AgentId,
    // TODO(sam): use examples of agents in the graph, agents.map((a) => a.id).slice(0, 3).join(", ")
    // or -> make it a literal type of all agent IDs
  )`The ID of the Agent to create a Task for, e.g. @ceo, @sde, @cfo.`;
  const prompt = input("prompt")`The prompt to start the Task with.`;

  const reply = Tool("reply")`
Prompt an Agent (by ${agentId}) to reply in a Threa. The agent is given a ${prompt} to orient the direction of the task,
but is otherwise free to choose how to complete the task.
`(function* ({ agentId, prompt }) {
    // TODO(sam): look up in the graph
    const agent = undefined!;
    const stream = yield* startTask({
      agent,
      thread,
      prompt,
    });
  });

  const stream = llm.stream({
    system: "You are a helpful assistant.",
    messages: [],
    tools: [evaluate, reply],
  });
});
