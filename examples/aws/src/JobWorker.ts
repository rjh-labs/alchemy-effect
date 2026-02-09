import * as Alchemy from "alchemy-effect";
// our brand is not a Thing
import * as Service from "alchemy-effect/Service";
// their brand is a Thing
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Stream from "effect/Stream";
import { JobQueue } from "./JobQueue.ts";

// Consumer<T>

// export class JobWorker extends JobQueue.Consumer("JobWorker") {}
export class JobWorker extends Alchemy.EventConsumer("JobWorker", {
  source: JobQueue,
}) {}

// cloud agnostic consumer
export const jobWorker = Service.effect(
  JobQueue,
  Effect.gen(function* () {
    // (optionally init dependencies here)
    return {
      consume: flow(
        Stream.mapEffect((job) => {
          return Effect.gen(function* () {
            return yield* jobStorage.getJob(job.id);
          });
        }),
      ),
    };
  }),
);
