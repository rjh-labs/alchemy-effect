import type { Context as LambdaContext, S3Event } from "aws-lambda";
import * as Effect from "effect/Effect";
import { declare, type From } from "../../../Capability.ts";
import type { OnBucketEvent } from "../../S3/bucket.on-event.ts";
import type { Bucket } from "../../S3/Bucket.ts";
import {
  BucketEventSource,
  type BucketEventSourceProps,
} from "../BucketEventSource.ts";
import * as Lambda from "../Function.ts";

export type { S3Event } from "aws-lambda";

export const consumeBucketNotification =
  <B extends Bucket, ID extends string, Req>(
    id: ID,
    {
      bucket,
      handle,
      ...eventSourceProps
    }: {
      bucket: B;
      handle: (
        event: S3Event,
        context: LambdaContext,
      ) => Effect.Effect<void, never, Req>;
    } & BucketEventSourceProps,
  ) =>
  <const Props extends Lambda.FunctionProps<Req>>({
    bindings,
    ...props
  }: Props) =>
    Lambda.Function(id, {
      handle: Effect.fn(function* (event: S3Event, context: LambdaContext) {
        yield* declare<OnBucketEvent<From<B>>>();
        yield* handle(event, context);
      }),
    })({
      ...props,
      bindings: bindings.and(BucketEventSource(bucket, eventSourceProps)),
    });
