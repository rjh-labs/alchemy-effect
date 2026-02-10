import { Schema as S, SLayer, Server } from "alchemy-effect";
import * as Effect from "effect/Effect";

import { Job, JobId } from "../Job.ts";
import { JobStorage } from "../JobStorage.ts";
import { InvalidJobId } from "./InvalidJobId.ts";

export class GetJobRequest extends S.Class<GetJobRequest>("GetJobRequest")({
  jobId: JobId,
}) {}

export class GetJobResponse extends S.Class<GetJobResponse>(
  "ListTodosResponse",
)({
  job: S.optional(Job),
}) {}

export class GetJob extends Server.Operation("GetJob", {
  input: GetJobRequest,
  output: GetJobResponse,
  errors: [InvalidJobId],
}) {}

export const getJob = SLayer.effect(
  GetJob,
  Effect.gen(function* () {
    // everything has to be here
    const jobStorage = yield* JobStorage;
    return Effect.fn(function* (request: GetJobRequest) {
      return {
        job: yield* jobStorage.getJob(request.jobId),
      };
    });
  }),
);
