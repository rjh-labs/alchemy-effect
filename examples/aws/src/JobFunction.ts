import * as AWS from "alchemy-effect/AWS";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { jobApi, JobApi } from "./JobApi.ts";
import { S3JobQueue } from "./JobQueue.ts";
import { JobsBucket } from "./JobsBucket.ts";
import { S3JobStorage } from "./JobStorage.ts";
import { JobWorker, jobWorker } from "./JobWorker.ts";

// TAG (a way to reference the Lambda without bloating bundle)
export class JobFunction extends AWS.Lambda.Function("JobFunction", {
  services: [JobApi, JobWorker],
}) {}

// IMPLEMENTATION (provide all the runtime layers and infra dependencies)
export default JobFunction.pipe(
  Effect.provide(
    Layer.provide(
      Layer.mergeAll(jobApi, jobWorker),
      Layer.provideMerge(S3JobQueue, S3JobStorage),
    ),
  ),
  AWS.Lambda.make({
    main: import.meta.filename,
  }),
  // Add infra dependencies and enforce least privilege IAM policies
  AWS.Lambda.bind(
    AWS.S3.GetObject(JobsBucket),
    AWS.S3.PutObject(JobsBucket),
    AWS.Lambda.BucketEventSource(JobsBucket),
    // AWS.Bridge.Cloudflare(),
  ),
);
