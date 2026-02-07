import * as Effect from "effect/Effect";
import type { Bucket } from "../Bucket.ts";
import { getR2BucketFromEnv } from "../util/getR2BucketFromEnv.ts";

export const deleteObject = Effect.fnUntraced(function* <B extends Bucket>(
  bucket: B,
  keys: string | string[],
) {
  const client = yield* getR2BucketFromEnv(bucket);
  return yield* Effect.promise(() => client.delete(keys));
});
