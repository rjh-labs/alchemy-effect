import * as Alchemy from "alchemy-effect";
import * as S3 from "alchemy-effect/AWS/S3";
import * as Service from "alchemy-effect/Service";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";

import { decodeJob, Job } from "../Job.ts";
import { JobsBucket } from "../JobsBucket.ts";

export class JobQueue extends Alchemy.EventSource<JobQueue>()("JobQueue", {
  event: Job,
}) {}

// cloud agnostic consumer
export const JobQueueConsumer = Service.consume(
  JobQueue,
  Effect.gen(function* () {
    // initialize any state scoped to a partition of the stream
    return (stream: Stream.Stream<S3.S3Event>) =>
      stream.pipe(Stream.map((a) => a));
  }),
);

// Implement the Event Source (map S3 events to the JobQueue events)
export const S3JobQueue = Service.effect(
  JobQueue,
  Effect.gen(function* () {
    // this only runs at runtime, but it projects a S3.Consume<Jobs> capability requirement
    return S3.consumeBucketNotifications(JobsBucket).pipe(
      Stream.flatMap((item) =>
        Stream.fromIterable(item.Records.map((record) => record.s3.object)),
      ),
      Stream.mapEffect((object) =>
        S3.getObject(JobsBucket, {
          key: object.key,
          ifMatch: object.eTag,
        }),
      ),
      Stream.mapEffect((object) =>
        object.Body
          ? object.Body.pipe(
              Stream.decodeText(),
              Stream.mkString,
              Effect.flatMap((body) =>
                Effect.try({
                  try: () => JSON.parse(body),
                  catch: (error) => Effect.fail(error),
                }),
              ),
              Effect.flatMap(decodeJob),
            )
          : Effect.fail(new Error("Invalid job body")),
      ),
    );
  }),
);
