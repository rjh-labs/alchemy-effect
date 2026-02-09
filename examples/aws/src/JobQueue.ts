import * as S3 from "alchemy-effect/AWS/S3";
import * as Service from "alchemy-effect/Service";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { decodeJob, Job } from "./Job.ts";
import { JobsBucket } from "./JobsBucket.ts";

// class _JobQueue extends EventSource.EventSource() // michael hates
// class __JobQueue extends EventSource.Tag() // john and harry likes
// class ___JobQueue extends EventSource.Events() // harry likes
// class ___JobQueue extends EventSource.EventStream() // michael hates
// class ___JobQueue extends EventSource.Source() // michael hates
// class ___JobQueue extends EventSource.Producer()
// class ___JobQueue extends EventSource.Bus()
// class ___JobQueue extends EventSource.EventBus()

// import * as EventSource from "alchemy-effect/EventSource";

// un-ordered but stream implies order?
export class JobQueue extends Alchemy.EventSource<JobQueue>()("JobQueue", {
  schema: Job,
}) {}

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
        }).pipe(Effect.orDie),
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
          : Effect.dieMessage("Invalid job body"),
      ),
      Stream.orDie,
    );
  }),
);
