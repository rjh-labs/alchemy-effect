import * as S from "effect/Schema";

export type JobId = S.Schema.Type<typeof JobId>;
export const JobId = S.String.annotations({
  description: "The ID of the job",
});

export class Job extends S.Class<Job>("Job")({
  id: JobId,
  content: S.String,
}) {}

export const decodeJob = S.decode(Job);
