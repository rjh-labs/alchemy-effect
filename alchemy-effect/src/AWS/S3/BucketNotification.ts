import * as Stream from "effect/Stream";
import type { Capability, From } from "../../Capability.ts";
import type { Bucket } from "./Bucket.ts";
import type { S3Event } from "./S3Event.ts";

/**
 * Capability for handling S3 bucket events.
 */
export interface ConsumeBucketNotifications<B = Bucket> extends Capability<
  "AWS.S3.OnBucketEvent",
  B
> {}

export const consumeBucketNotifications = <B extends Bucket>(
  bucket: B,
): Stream.Stream<S3Event, never, ConsumeBucketNotifications<From<B>>> =>
  undefined!;
