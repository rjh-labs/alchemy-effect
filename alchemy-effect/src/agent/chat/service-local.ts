import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import * as DynamoDB from "../../aws/dynamodb/index.ts";
import * as SQS from "../../aws/sqs/index.ts";
import * as Alchemy from "../../index.ts";
import { type } from "../../index.ts";
import * as Service from "../../service.ts";

export class Message extends S.Class<Message>("Message")({
  id: S.String,
  content: S.String,
}) {}

export class Messages extends SQS.Queue("Messages", {
  schema: Message,
}) {}

export class Jobs extends DynamoDB.Table("Jobs", {
  partitionKey: "id",
  attributes: {
    id: S.String,
    content: S.String,
  },
  items: type<Job>,
}) {}

export class Job extends S.Class<Job>("Job")({
  id: S.String,
  content: S.String,
}) {}

export class MessageService extends Alchemy.Service("MessageService")<
  MessageService,
  {
    sendMessage: (message: Message) => Effect.Effect<void>;
    getMessage: (messageId: string) => Effect.Effect<Message | undefined>;
  }
>() {}

export class JobStorage extends Service.Tag("JobStorage")<
  JobStorage,
  {
    putJob: (job: Job) => Effect.Effect<void>;
    getJob: (jobId: string) => Effect.Effect<Job | undefined>;
  }
>() {}

export const jobStorageDynamoDB = Alchemy.Service.effect(
  JobStorage,
  Effect.gen(function* () {
    return {
      putJob: (job) => Effect.dieMessage("Not implemented"),
      getJob: (jobId) => Effect.dieMessage("Not implemented"),
    };
  }),
);

export class JobService extends Alchemy.Service("JobService")<
  JobService,
  {
    submitJob: (job: Job) => Effect.Effect<void, never, never>;
    getJob: (jobId: string) => Effect.Effect<Job | undefined, never, never>;
  }
>() {}

export const jobService = Alchemy.Service.effect(
  JobService,
  Effect.gen(function* () {
    //
    const messageService = yield* MessageService;
    const jobStorage = yield* JobStorage;

    return {
      submitJob: (job) => {
        return messageService.sendMessage(job);
      },
      getJob: (jobId) => {
        return messageService.getMessage(jobId);
      },
    };
  }),
);
