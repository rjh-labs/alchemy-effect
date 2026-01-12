import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface DeleteMessageBatch<Q = Queue> extends Capability<
  "AWS.SQS.DeleteMessageBatch",
  Q
> {}

export const DeleteMessageBatch = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, DeleteMessageBatch<To<Q>>>
>(Function, "AWS.SQS.DeleteMessageBatch");

export interface DeleteMessageBatchEntry {
  /**
   * An identifier for this particular receipt handle used to communicate the result.
   */
  id: string;
  /**
   * The receipt handle associated with the message to delete.
   */
  receiptHandle: string;
}

export const deleteMessageBatch = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
  entries: DeleteMessageBatchEntry[],
) {
  yield* declare<DeleteMessageBatch<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.deleteMessageBatch({
    QueueUrl: url,
    Entries: entries.map((entry) => ({
      Id: entry.id,
      ReceiptHandle: entry.receiptHandle,
    })),
  });
});

export const deleteMessageBatchFromLambdaFunction = () =>
  DeleteMessageBatch.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "DeleteMessageBatch",
          Effect: "Allow",
          Action: ["sqs:DeleteMessage"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
