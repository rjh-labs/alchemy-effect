// @ts-nocheck
import * as HttpEndpoint from "alchemy-effect/HttpEndpoint";
import * as Router from "alchemy-effect/Router";

import { GetJob } from "./routes/get-job.ts";
import { PutJob } from "./routes/put-job.ts";

export class JobApi extends HttpEndpoint.Tag("JobApi", {
  routes: [GetJob, PutJob],
}) {}

export const jobApi = HttpEndpoint.effect(JobApi, Router.make(getJob, putJob));

export class JobFunction extends Lambda.Function("JobFunction") {}

// Bind entrypoint
export default JobFunction.pipe(
  Alchemy.host(jobApi, jobWorker),
  Effect.provide(Layer.mergeAll(s3JobStorage, Router.schema(JobRouter))),
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
    DurableObject.SQLite(JobDO),
  ),
);
