import * as Route from "alchemy-effect/Route";
import * as S from "alchemy-effect/Schema";
import * as Service from "alchemy-effect/Service";
import * as Effect from "effect/Effect";

import { InvalidJobId } from "../errors/InvalidJobId.ts";
import { Job } from "../Job.ts";
import { JobStorage } from "../services/JobStorage.ts";

export class PutJobRequest extends S.Class<PutJobRequest>("PutJobRequest")({
  content: S.String,
}) {}

export class PutJobResponse extends S.Class<PutJobResponse>("PutJobResponse")({
  job: Job,
}) {}

export class PutJob extends Route.Tag("PutJob", {
  input: PutJobRequest,
  output: PutJobResponse,
  errors: [InvalidJobId],
}) {}

export const putJob = Service.effect(
  PutJob,
  Effect.gen(function* () {
    const jobStorage = yield* JobStorage;
    return Effect.fn(function* (request: PutJobRequest) {
      yield* jobStorage.putJob(request.job);
    });
  }),
);
