import * as Alchemy from "alchemy-effect";
import * as Lambda from "alchemy-effect/AWS/Lambda";
import * as Function from "alchemy-effect/AWS/Lambda/Function";
import * as HttpEndpoint from "alchemy-effect/HttpEndpoint";
import * as Router from "alchemy-effect/Router";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { JobsBucket } from "./JobsBucket.ts";
import { getJob, GetJob } from "./routes/getJob.ts";
import { putJob, PutJob } from "./routes/putJob.ts";
import { JobQueue, s3JobQueue } from "./services/JobQueue.ts";
import { s3JobStorage } from "./services/JobStorage.ts";

export class JobApi extends HttpEndpoint.Tag("JobApi", {
  routes: [GetJob, PutJob],
}) {}

export class JobApiFunction extends Lambda.Function("JobApiFunction", {
  hosts: [JobApi, JobQueue],
}) {}

export const jobApi = JobApi.pipe(
  HttpEndpoint.effect(JobApi, Router.make(getJob, putJob)),
);

// Bind entrypoint
export default JobApiFunction.pipe(
  Effect.provide(
    Layer.mergeAll(jobApi, s3JobQueue).pipe(Layer.provide(s3JobStorage)),
  ),
  Function.make(function* () {
    return {
      main: import.meta.filename,
      memorySize: yield* Config.number("JOB_FUNCTION_MEMORY_SIZE").pipe(
        Config.withDefault(1024),
      ),
    };
  }),
  Alchemy.bind(
    Lambda.GetObject(JobsBucket),
    Lambda.PutObject(JobsBucket),
    Lambda.BucketEventSource(JobsBucket),
  ),
);
