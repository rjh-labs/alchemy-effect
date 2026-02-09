import * as Alchemy from "alchemy-effect";
import * as S from "alchemy-effect/Schema";
import * as Effect from "effect/Effect";

import * as Service from "alchemy-effect/Service";
import { InvalidJobId } from "../errors/InvalidJobId.ts";
import { Job, JobId } from "../Job.ts";
import { JobStorage } from "../services/JobStorage.ts";

export class GetJobRequest extends S.Class<GetJobRequest>("GetJobRequest")({
  jobId: JobId,
}) {}

export class GetJobResponse extends S.Class<GetJobResponse>(
  "ListTodosResponse",
)({
  job: S.optional(Job),
}) {}

export class GetJob extends Alchemy.Route("GetJob", {
  input: GetJobRequest,
  output: GetJobResponse,
  errors: [InvalidJobId],
}) {}

export const getJob = Service.effect(
  GetJob,
  Effect.gen(function* () {
    const jobStorage = yield* JobStorage;
    return Effect.fn(function* (request: GetJobRequest) {
      return {
        job: yield* jobStorage.getJob(request.jobId),
      };
    });
  }),
);
