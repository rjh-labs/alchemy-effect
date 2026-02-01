import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { AgentId } from "../agent/agent.ts";
import { Task, TaskId } from "../agent/task.ts";
import { StreamTextPart } from "../llm/stream-text-part.ts";
import { ChannelId } from "./channel.ts";
import type { ChatEvent } from "./event.ts";
import { Message, MessageId } from "./message.ts";
import { Thread, ThreadId } from "./thread.ts";

export type SenderId = string;
export const SenderId = S.String.annotations({
  description: "The ID of the Agent or User who sent the message",
});

export class GetThreadRequest extends S.Class<GetThreadRequest>(
  "GetThreadRequest",
)({
  threadId: ThreadId,
}) {}

export class GetThreadResponse extends S.Class<GetThreadResponse>(
  "GetThreadResponse",
)({
  thread: S.optional(Thread),
}) {}

export class CreateThreadRequest extends S.Class<CreateThreadRequest>(
  "CreateThreadRequest",
)({
  channelId: ChannelId,
  parentThreadId: S.optional(ThreadId),
}) {}

export class CreateThreadResponse extends S.Class<CreateThreadResponse>(
  "CreateThreadResponse",
)({
  thread: Thread,
}) {}

export class SendMessageRequest extends S.Class<SendMessageRequest>(
  "SendMessageRequest",
)({
  threadId: ThreadId,
  sender: SenderId,
  content: S.String,
}) {}

export class SendMessageResponse extends S.Class<SendMessageResponse>(
  "SendMessageResponse",
)({
  messageId: MessageId,
}) {}

export class ListMessagesRequest extends S.Class<ListMessagesRequest>(
  "ListMessagesRequest",
)({
  threadId: ThreadId,
  nextToken: S.optional(S.String),
}) {}

export class ListMessagesResponse extends S.Class<ListMessagesResponse>(
  "ListMessagesResponse",
)({
  messages: S.Array(Message),
  nextToken: S.optional(S.String),
}) {}

export class ListThreadsRequest extends S.Class<ListThreadsRequest>(
  "ListThreadsRequest",
)({
  channelId: ChannelId,
  nextToken: S.optional(S.String),
}) {}

export class ListThreadsResponse extends S.Class<ListThreadsResponse>(
  "ListThreadsResponse",
)({
  threads: S.Array(Thread),
  nextToken: S.optional(S.String),
}) {}

export class AppendRequest extends S.Class<AppendRequest>("AppendRequest")({
  taskId: TaskId,
  part: StreamTextPart,
}) {}

export class SubscribeRequest extends S.Class<SubscribeRequest>(
  "SubscribeRequest",
)({
  taskId: TaskId,
}) {}

export class CreateTaskRequest extends S.Class<CreateTaskRequest>(
  "CreateTaskRequest",
)({
  threadId: ThreadId,
  agentId: AgentId,
}) {}

/**
 * The ChatService is the central service for managing Channels, Threads, and Messages.
 */
export class ChatService extends Context.Tag("ChatService")<
  ChatService,
  {
    getThread: (input: GetThreadRequest) => Effect.Effect<GetThreadResponse>;
    createThread: (
      input: CreateThreadRequest,
    ) => Effect.Effect<CreateThreadResponse>;
    listThreads: (
      input: ListThreadsRequest,
    ) => Effect.Effect<ListThreadsResponse>;
    sendMessage: (
      input: SendMessageRequest,
    ) => Effect.Effect<SendMessageResponse>;
    listMessages: (
      input: ListMessagesRequest,
    ) => Effect.Effect<ListMessagesResponse>;

    /**
     * Subscribe to all events in the ChatService.
     */
    subscribe: () => Stream.Stream<ChatEvent>;

    /**
     * A Task is an isolated workspace where an Agent is working on performing a task and
     * preparing a reply to a Thread. It is where we can stream thinking traces, outputs,
     * tool calls, and results. A user shoul be able to tap into it to see what an Agent
     * is doing and interrupt/provide feedback directly.
     */
    createTask: (input: CreateTaskRequest) => Effect.Effect<Task>;
    appendTask: (input: AppendRequest) => Effect.Effect<void>;
    subscribeTask: (input: SubscribeRequest) => Stream.Stream<StreamTextPart>;
    sinkTask: (taskId: TaskId) => Sink.Sink<StreamTextPart, StreamTextPart>;
    interruptTask: (taskId: TaskId) => Effect.Effect<void>;
  }
>() {}
