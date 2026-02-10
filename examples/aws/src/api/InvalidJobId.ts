import * as S from "alchemy-effect/Schema";
import { JobId } from "../Job.ts";

export class InvalidJobId extends S.TaggedError<InvalidJobId>()(
  "InvalidJobId",
  {
    message: S.String,
    jobId: JobId,
  },
) {}
