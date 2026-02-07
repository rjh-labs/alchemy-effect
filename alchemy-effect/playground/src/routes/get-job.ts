import * as Route from "alchemy-effect/Route";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import { Job, JobId } from "../database/job.ts";
import { JobStorage } from "../services/job-storage.ts";

export class GetJobRequest extends S.Class<GetJobRequest>("GetJobRequest")({
  jobId: JobId,
}) {}

export class GetJobResponse extends S.Class<GetJobResponse>(
  "ListTodosResponse",
)({
  job: Job,
}) {}

export class InvalidJobId extends S.TaggedError<InvalidJobId>()(
  "InvalidJobId",
  {
    message: S.String,
    jobId: JobId,
  },
) {}

export class GetJob extends Route.Tag("GetJob", {
  input: GetJobRequest,
  output: GetJobResponse,
  errors: [],
}) {}

export const getJob = Route.effect(
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
