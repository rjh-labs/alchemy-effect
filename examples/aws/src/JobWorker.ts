import * as Alchemy from "alchemy-effect";
import * as Service from "alchemy-effect/Service";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Stream from "effect/Stream";
import { JobQueue } from "./JobQueue.ts";

// Consumer<T>
export class JobWorker extends Alchemy.Consumer("JobWorker", {
  // this is where the Layer requirement comes from
  source: JobQueue,
}) {}

// cloud agnostic consumer
export const jobWorker = Service.effect(
  JobQueue,
  // @ts-expect-error
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
