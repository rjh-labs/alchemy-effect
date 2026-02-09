import * as Alchemy from "alchemy-effect";
import * as Lambda from "alchemy-effect/AWS/Lambda";
import * as Function from "alchemy-effect/AWS/Lambda/Function";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { JobApi, jobApi } from "./JobApi.ts";
import { S3JobQueue } from "./JobQueue.ts";
import { JobsBucket } from "./JobsBucket.ts";
import { S3JobStorage } from "./JobStorage.ts";
import { JobWorker, jobWorker } from "./JobWorker.ts";

// TAG
export class JobFunction extends AWS.Lambda.Function("JobFunction", {
  // not sure about this:
  // disallow things that can't be hosted (non-entrypoints)
  services: [JobApi, JobWorker],
}) {}

// IMPLEMENTATION
export default Function.make(JobFunction, {
  main: import.meta.filename,
}).pipe(
  Effect.provide(
    Layer.mergeAll(jobApi, jobWorker).pipe(
      Layer.provide(Layer.provide(S3JobQueue, S3JobStorage)),
    ),
  ),
  // least privilege
  Alchemy.bind(
    Lambda.GetObject(JobsBucket),
    Lambda.PutObject(JobsBucket),
    // requires this
    Lambda.BucketEventSource(JobsBucket),
  ),
);
