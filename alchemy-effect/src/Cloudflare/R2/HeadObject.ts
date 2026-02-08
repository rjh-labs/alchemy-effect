import * as Effect from "effect/Effect";
import type { Bucket } from "./Bucket.ts";
import { getR2BucketFromEnv } from "./util/getR2BucketFromEnv.ts";

export const headObject = Effect.fnUntraced(function* <B extends Bucket>(
  bucket: B,
  key: string,
) {
  const client = yield* getR2BucketFromEnv(bucket);
  return yield* Effect.promise(() => client.head(key));
});
