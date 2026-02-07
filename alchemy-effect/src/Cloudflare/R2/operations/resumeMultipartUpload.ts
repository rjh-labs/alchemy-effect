import type * as runtime from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import { replaceEffectStream } from "../../stream.ts";
import type { Bucket } from "../Bucket.ts";
import {
  getR2BucketFromEnv,
  type UploadValue,
} from "../util/getR2BucketFromEnv.ts";

export const resumeMultipartUpload = Effect.fnUntraced(function* <
  R2Bucket extends Bucket,
>(bucket: R2Bucket, key: string, uploadId: string) {
  const client = yield* getR2BucketFromEnv(bucket);
  return yield* Effect.sync(() =>
    makeMultipartUploadEffectClient(
      client.resumeMultipartUpload(key, uploadId),
    ),
  );
});

const makeMultipartUploadEffectClient = (
  multipartUpload: runtime.R2MultipartUpload,
) => ({
  key: multipartUpload.key,
  uploadId: multipartUpload.uploadId,
  uploadPart: Effect.fnUntraced(function* (
    partNumber: number,
    value: UploadValue,
    options?: runtime.R2UploadPartOptions,
  ) {
    return yield* Effect.promise(() =>
      multipartUpload.uploadPart(
        partNumber,
        replaceEffectStream(value),
        options,
      ),
    );
  }),
  abort: Effect.fnUntraced(function* () {
    return yield* Effect.promise(() => multipartUpload.abort());
  }),
  complete: Effect.fnUntraced(function* (
    uploadedParts: runtime.R2UploadedPart[],
  ) {
    return yield* Effect.promise(() => multipartUpload.complete(uploadedParts));
  }),
});
