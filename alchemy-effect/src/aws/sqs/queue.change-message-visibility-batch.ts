import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface ChangeMessageVisibilityBatch<Q = Queue> extends Capability<
  "AWS.SQS.ChangeMessageVisibilityBatch",
  Q
> {}

export const ChangeMessageVisibilityBatch = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, ChangeMessageVisibilityBatch<To<Q>>>
>(Function, "AWS.SQS.ChangeMessageVisibilityBatch");

export interface ChangeMessageVisibilityBatchEntry {
  /**
   * An identifier for this particular receipt handle used to communicate the result.
   */
  id: string;
  /**
   * The receipt handle associated with the message whose visibility timeout is changed.
   */
  receiptHandle: string;
  /**
   * The new value for the message's visibility timeout (in seconds, 0 to 43200).
   */
  visibilityTimeout?: number;
}

export const changeMessageVisibilityBatch = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
  entries: ChangeMessageVisibilityBatchEntry[],
) {
  yield* declare<ChangeMessageVisibilityBatch<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.changeMessageVisibilityBatch({
    QueueUrl: url,
    Entries: entries.map((entry) => ({
      Id: entry.id,
      ReceiptHandle: entry.receiptHandle,
      VisibilityTimeout: entry.visibilityTimeout,
    })),
  });
});

export const changeMessageVisibilityBatchFromLambdaFunction = () =>
  ChangeMessageVisibilityBatch.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "ChangeMessageVisibilityBatch",
          Effect: "Allow",
          Action: ["sqs:ChangeMessageVisibility"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
