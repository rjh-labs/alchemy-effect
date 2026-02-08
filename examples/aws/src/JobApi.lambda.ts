import * as Alchemy from "alchemy-effect";
import * as Lambda from "alchemy-effect/AWS/Lambda";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { jobApi, JobApi } from "./JobApi.ts";
import { JobsBucket } from "./JobsBucket.ts";
import { JobQueue, S3JobQueue } from "./services/JobQueue.ts";
import { S3JobStorage } from "./services/JobStorage.ts";

export class JobApiFunction extends Lambda.Function("JobApiFunction", {
  services: [JobApi, JobQueue],
}) {}

// Bind entrypoint
export default JobApiFunction.pipe(
  Effect.provide(
    Layer.mergeAll(jobApi, S3JobQueue).pipe(Layer.provide(S3JobStorage)),
  ),
  Lambda.Function.make({
    main: import.meta.filename,
  }),
  Alchemy.bind(
    Lambda.GetObject(JobsBucket),
    Lambda.PutObject(JobsBucket),
    Lambda.BucketEventSource(JobsBucket),
  ),
);
