import type * as runtime from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import { replaceEffectStream } from "../../stream.ts";
import type { Bucket } from "../Bucket.ts";
import {
  getR2BucketFromEnv,
  type UploadValue,
} from "../util/getR2BucketFromEnv.ts";

export const putObject = Effect.fnUntraced(function* <B extends Bucket>(
  bucket: B,
  key: string,
  value: UploadValue,
  options?: runtime.R2PutOptions,
) {
  const client = yield* getR2BucketFromEnv(bucket);
  return yield* Effect.promise(() =>
    client.put(key, replaceEffectStream(value), options),
  );
});
