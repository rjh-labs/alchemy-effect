import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface ChangeMessageVisibility<Q = Queue> extends Capability<
  "AWS.SQS.ChangeMessageVisibility",
  Q
> {}

export const ChangeMessageVisibility = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, ChangeMessageVisibility<To<Q>>>
>(Function, "AWS.SQS.ChangeMessageVisibility");

export interface ChangeMessageVisibilityOptions {
  /**
   * The receipt handle associated with the message whose visibility timeout is changed.
   */
  receiptHandle: string;
  /**
   * The new value for the message's visibility timeout (in seconds, 0 to 43200).
   */
  visibilityTimeout: number;
}

export const changeMessageVisibility = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
  options: ChangeMessageVisibilityOptions,
) {
  yield* declare<ChangeMessageVisibility<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.changeMessageVisibility({
    QueueUrl: url,
    ReceiptHandle: options.receiptHandle,
    VisibilityTimeout: options.visibilityTimeout,
  });
});

export const changeMessageVisibilityFromLambdaFunction = () =>
  ChangeMessageVisibility.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "ChangeMessageVisibility",
          Effect: "Allow",
          Action: ["sqs:ChangeMessageVisibility"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
