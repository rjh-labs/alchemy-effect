import * as Alchemy from "alchemy-effect";
import * as Lambda from "alchemy-effect/AWS/Lambda";
import * as Function from "alchemy-effect/AWS/Lambda/Function";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { JobApi, jobApi } from "./JobApi.ts";
import { JobsBucket } from "./JobsBucket.ts";
import { S3JobQueue } from "./services/JobQueue.ts";
import { S3JobStorage } from "./services/JobStorage.ts";
import { JobWorker, jobWorker } from "./services/JobWorker.ts";

export class JobFunction extends Lambda.Function("JobFunction", {
  services: [JobApi, JobWorker],
}) {}

export default Function.make(JobFunction, {
  main: import.meta.filename,
}).pipe(
  Effect.provide(
    Layer.mergeAll(jobApi, jobWorker).pipe(
      Layer.provide(Layer.provide(S3JobQueue, S3JobStorage)),
    ),
  ),
  Alchemy.bind(
    Lambda.GetObject(JobsBucket),
    Lambda.PutObject(JobsBucket),
    Lambda.BucketEventSource(JobsBucket),
  ),
);
