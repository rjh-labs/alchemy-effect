import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface ReceiveMessage<Q = Queue> extends Capability<
  "AWS.SQS.ReceiveMessage",
  Q
> {}

export const ReceiveMessage = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, ReceiveMessage<To<Q>>>
>(Function, "AWS.SQS.ReceiveMessage");

export interface ReceiveMessageOptions {
  /**
   * The maximum number of messages to return (1-10).
   * @default 1
   */
  maxNumberOfMessages?: number;
  /**
   * The duration (in seconds) that the received messages are hidden from subsequent retrieve requests.
   */
  visibilityTimeout?: number;
  /**
   * The duration (in seconds) for which the call waits for a message to arrive (0-20).
   * @default 0
   */
  waitTimeSeconds?: number;
  /**
   * A list of attributes that need to be returned along with each message.
   */
  attributeNames?: SQS.QueueAttributeName[];
  /**
   * A list of message attribute names to receive.
   */
  messageAttributeNames?: string[];
  /**
   * A list of message system attribute names to receive.
   */
  messageSystemAttributeNames?: SQS.MessageSystemAttributeName[];
  /**
   * This parameter applies only to FIFO queues.
   * The token used for deduplication of ReceiveMessage calls.
   */
  receiveRequestAttemptId?: string;
}

export const receiveMessage = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
  options?: ReceiveMessageOptions,
) {
  yield* declare<ReceiveMessage<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.receiveMessage({
    QueueUrl: url,
    MaxNumberOfMessages: options?.maxNumberOfMessages,
    VisibilityTimeout: options?.visibilityTimeout,
    WaitTimeSeconds: options?.waitTimeSeconds,
    AttributeNames: options?.attributeNames,
    MessageAttributeNames: options?.messageAttributeNames,
    MessageSystemAttributeNames: options?.messageSystemAttributeNames,
    ReceiveRequestAttemptId: options?.receiveRequestAttemptId,
  });
});

export const receiveMessageFromLambdaFunction = () =>
  ReceiveMessage.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "ReceiveMessage",
          Effect: "Allow",
          Action: ["sqs:ReceiveMessage"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
