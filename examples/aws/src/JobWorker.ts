import { SLayer } from "alchemy-effect";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Stream from "effect/Stream";
import { JobQueue } from "./JobQueue.ts";

export class JobWorker extends JobQueue.Consumer("JobWorker") {}

export const jobWorker = SLayer.effect(
  JobWorker,
  Effect.gen(function* () {
    // (optionally init dependencies here)
    return {
      consume: flow(
        Stream.map((a) => a),
        Stream.map((a) => a),
      ),
    };
  }),
);
