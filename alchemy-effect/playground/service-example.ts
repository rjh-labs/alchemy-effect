// @ts-nocheck
import { HttpServerResponse } from "@effect/platform";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Alchemy from "../src/index.ts";
import * as Service from "../src/service.ts";
import * as Api from "./api.ts";
import * as S3 from "./aws/s3/index.ts";

// Data Schemas
export class Message extends S.Class<Message>("Message")({
  id: S.String,
  content: S.String,
}) {}

export class Job extends S.Class<Job>("Job")({
  id: S.String,
  content: S.String,
}) {}

///// Job API ///////
export class JobApi extends Api.Tag("JobApi", {
  schema: undefined!, // Integrate with our router or effect router
}) {}

export const jobApi = Api.layer(
  JobApi,
  Effect.gen(function* () {
    const jobStorage = yield* JobStorage;
    return {
      fetch: Effect.fn(function* (request) {
        const job = yield* jobStorage.getJob(request.body.jobId);
        return yield* HttpServerResponse.json(job);
      }),
    };
  }),
);

///// Job Storage Service ///////

export class JobStorage extends Service.Tag("JobStorage")<
  JobStorage,
  {
    putJob: (job: Job) => Effect.Effect<void>;
    getJob: (jobId: string) => Effect.Effect<Job | undefined>;
  }
>() {}

export class Jobs extends S3.Bucket("Jobs") {}

export const s3JobStorage = Service.layer(
  JobStorage,
  Effect.gen(function* () {
    return {
      putJob: (job) =>
        S3.putObject(Jobs, {
          key: job.id,
          body: JSON.stringify(job),
        }).pipe(
          Effect.flatMap(() => Effect.void),
          Effect.orDie,
        ),
      getJob: (jobId) =>
        S3.getObject(Jobs, {
          key: jobId,
        }).pipe(
          Effect.map((item) => item.Body as any),
          Effect.orDie,
        ),
    };
  }),
);

// Consume events from the Jobs bucket and process them
export const jobWorker = Jobs.pipe(
  EventSource.consume((stream) =>
    stream.pipe(
      Stream.map((item) => item.Body as any),
      Stream.run,
    ),
  ),
);

// declare the Job Lambda Function (just a tag at this point)
export class JobFunction extends Lambda.Function("JobFunction") {}

export default JobFunction.pipe(
  Alchemy.host(jobApi, jobWorker),
  Effect.provide(s3JobStorage),
  Lambda.make(function* () {
    const memorySize = yield* Config.get("JOB_FUNCTION_MEMORY_SIZE").pipe(
      Config.getOrElse(() => 1024),
    );
    return {
      main: import.meta.filename,
      memorySize,
    };
  }),
  Alchemy.bind(
    Lambda.GetObject(Jobs),
    Lambda.PutObject(Jobs),
    Lambda.BucketEventSource(Jobs),
  ),
);
