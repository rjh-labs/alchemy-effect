import * as S3 from "alchemy-effect/AWS/S3";
import * as Service from "alchemy-effect/Service";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";

import type { Job } from "./Job.ts";
import { JobsBucket } from "./JobsBucket.ts";

// TAG
export class JobStorage extends Context.Tag("JobStorage")<
  JobStorage,
  {
    putJob: (job: Job) => Effect.Effect<void>;
    getJob: (jobId: string) => Effect.Effect<Job | undefined>;
  }
>() {}

export const S3JobStorage = Service.effect(
  JobStorage,
  Effect.gen(function* () {
    return {
      putJob: (job) =>
        // S3.PutObject<Jobs>
        S3.putObject(JobsBucket, {
          key: job.id,
          body: JSON.stringify(job),
        }).pipe(
          Effect.flatMap(() => Effect.void),
          Effect.orDie,
        ),
      getJob: (jobId) =>
        // S3.GetObject<Jobs>
        S3.getObject(JobsBucket, {
          key: jobId,
        }).pipe(
          Effect.map((item) => item.Body as any),
          Effect.orDie,
        ),
    };
  }),
);
