import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { AgentId } from "../agent.ts";
import { Chat } from "../chat/service.ts";
import { Thread } from "../chat/thread.ts";
import { LLM } from "../llm/llm.ts";
import { Tool } from "../tool/tool.ts";
import { startTask } from "./task.ts";
/**
 * Called whenever a message is sent by a user to a Thread.
 *
 * This uses an LLM to choose which agents should respond to the message.
 */
export const driveThread = Effect.fn("driveThread")(function* (thread: Thread) {
  class code extends Tool.input("code")`Code to evaluate.` {}

  class evaluate extends Tool("eval")`
Evaluates ${code} in the context of a Thread.
Use this tool to explore the Chat environment and find relevant information.`(
    function* ({ code }) {
      // oxlint-disable-next-line no-eval
      return eval(code);
    },
  ) {}

  class agentId extends Tool.input(
    "agentId",
    AgentId,
    // TODO(sam): use examples of agents in the graph, agents.map((a) => a.id).slice(0, 3).join(", ")
    // or -> make it a literal type of all agent IDs
  )`The ID of the Agent to create a Task for, e.g. @ceo, @sde, @cfo.` {}

  class prompt extends Tool.input(
    "prompt",
  )`The prompt to start the Task with.` {}

  class reply extends Tool("reply")`
Prompt an Agent (by ${agentId}) to reply in a Thread. The agent is given a ${prompt} to orient the direction of the task,
but is otherwise free to choose how to complete the task.
`(function* ({ agentId, prompt }) {
    // TODO(sam): look up in the graph
    const agent = undefined!;
    const stream = yield* startTask({
      agent,
      thread,
      prompt,
    });
  }) {}

  const stream = LLM.stream({
    system: "You are a helpful assistant.",
    messages: [],
    tools: [evaluate, reply],
  }).pipe(Stream.tapSink(Chat.sinkThreadDriver(thread.threadId)));
});
