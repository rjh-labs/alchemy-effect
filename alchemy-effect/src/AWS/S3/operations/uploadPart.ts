import * as Effect from "effect/Effect";

import * as S3 from "distilled-aws/s3";
import { Binding } from "../../../Binding.ts";
import { declare, type Capability, type To } from "../../../Capability.ts";
import { toEnvKey } from "../../../internal/util/env.ts";
import { Function } from "../../Lambda/Function.ts";
import { Bucket } from "../Bucket.ts";

export interface UploadPart<B = Bucket> extends Capability<
  "AWS.S3.UploadPart",
  B
> {}

export const UploadPart = Binding<
  <B extends Bucket>(bucket: B) => Binding<Function, UploadPart<To<B>>>
>(Function, "AWS.S3.UploadPart");

export interface UploadPartOptions {
  key: string;
  uploadId: string;
  partNumber: number;
  body: string | Buffer | Uint8Array;
  contentLength?: number;
  contentMD5?: string;
}

export const uploadPart = Effect.fnUntraced(function* <B extends Bucket>(
  bucket: B,
  options: UploadPartOptions,
) {
  yield* declare<UploadPart<To<B>>>();
  const bucketName = process.env[toEnvKey(bucket.id, "BUCKET_NAME")]!;

  return yield* S3.uploadPart({
    Bucket: bucketName,
    Key: options.key,
    UploadId: options.uploadId,
    PartNumber: options.partNumber,
    Body: options.body,
    ContentLength: options.contentLength,
    ContentMD5: options.contentMD5,
  });
});

export const UploadPartBinding = () =>
  UploadPart.provider.succeed({
    attach: ({ source: bucket }) => ({
      env: {
        [toEnvKey(bucket.id, "BUCKET_NAME")]: bucket.attr.bucketName,
        [toEnvKey(bucket.id, "BUCKET_ARN")]: bucket.attr.bucketArn,
      },
      policyStatements: [
        {
          Sid: "UploadPart",
          Effect: "Allow",
          Action: ["s3:PutObject"],
          Resource: [`${bucket.attr.bucketArn}/*`],
        },
      ],
    }),
  });
