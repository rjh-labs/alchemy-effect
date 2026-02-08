import type * as runtime from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import type { Bucket } from "./Bucket.ts";
import { getR2BucketFromEnv } from "./util/getR2BucketFromEnv.ts";

export const listObjects = Effect.fnUntraced(function* <B extends Bucket>(
  bucket: B,
  options?: runtime.R2ListOptions,
) {
  const client = yield* getR2BucketFromEnv(bucket);
  return yield* Effect.promise(() => client.list(options));
});
