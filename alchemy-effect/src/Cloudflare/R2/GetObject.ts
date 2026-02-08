import type * as runtime from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import type { Bucket } from "./Bucket.ts";
import { getR2BucketFromEnv } from "./util/getR2BucketFromEnv.ts";

export const getObject = Effect.fnUntraced(function* <B extends Bucket>(
  bucket: B,
  key: string,
  options?: runtime.R2GetOptions,
) {
  const client = yield* getR2BucketFromEnv(bucket);
  return yield* Effect.promise(() => client.get(key, options));
});
