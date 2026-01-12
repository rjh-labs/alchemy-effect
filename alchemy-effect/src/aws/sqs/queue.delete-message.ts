import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface DeleteMessage<Q = Queue> extends Capability<
  "AWS.SQS.DeleteMessage",
  Q
> {}

export const DeleteMessage = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, DeleteMessage<To<Q>>>
>(Function, "AWS.SQS.DeleteMessage");

export interface DeleteMessageOptions {
  /**
   * The receipt handle associated with the message to delete.
   */
  receiptHandle: string;
}

export const deleteMessage = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
  options: DeleteMessageOptions,
) {
  yield* declare<DeleteMessage<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.deleteMessage({
    QueueUrl: url,
    ReceiptHandle: options.receiptHandle,
  });
});

export const deleteMessageFromLambdaFunction = () =>
  DeleteMessage.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "DeleteMessage",
          Effect: "Allow",
          Action: ["sqs:DeleteMessage"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
