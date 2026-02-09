import * as Service from "alchemy-effect/Service";
import * as Effect from "effect/Effect";
import { JobQueue } from "./JobQueue.ts";

export class JobWorker extends JobQueue.Consumer("JobWorker") {}

// cloud agnostic consumer
export const jobWorker = Service.effect(
  JobQueue,
  Effect.gen(function* () {
    // (optionally init dependencies here)
    return {
      consume: (stream) => stream.map((a) => a),
    };
  }),
);
