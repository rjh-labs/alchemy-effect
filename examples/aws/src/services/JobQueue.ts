import * as Alchemy from "alchemy-effect";
import * as S3 from "alchemy-effect/AWS/S3";
import * as Service from "alchemy-effect/Service";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

import { Job } from "../Job.ts";
import { JobsBucket } from "../JobsBucket.ts";

export class JobQueue extends Alchemy.EventSource("JobQueue", {
  event: Job,
}) {}

// IMPLEMENTATION (cloud specific)
export const S3JobQueue = Service.effect(
  JobQueue,
  Effect.gen(function* () {
    // this only runs at runtime, but it projects a S3.Consume<Jobs> capability requirement
    return S3.consume(JobsBucket).pipe(Stream.map((item) => item.Body as any));
  }),
);
