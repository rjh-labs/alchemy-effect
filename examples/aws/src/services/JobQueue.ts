import * as S3 from "alchemy-effect/AWS/S3";
import * as EventSource from "alchemy-effect/EventSource";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

import { JobStorage } from "./JobStorage.ts";

export class JobQueue extends EventSource.Tag("JobQueue")<JobQueue, {}>() {}

// IMPLEMENTATION (cloud specific)
export const s3JobQueue = EventSource.effect(
  JobQueue,
  Effect.gen(function* () {
    const jobStorage = yield* JobStorage;

    // this only runs at runtime, but it projects a S3.Consume<Jobs> capability requirement
    return S3.consume(Jobs, {
      // that means we can't configure infra here
      // GOOD: no co-mingling of business logic and infrastructure
      process: (stream) =>
        stream.pipe(
          Stream.map((item) => item.Body as any),
          Stream.tapSink(jobStorage.sink),
          Stream.run,
        ),
    });
  }),
);
