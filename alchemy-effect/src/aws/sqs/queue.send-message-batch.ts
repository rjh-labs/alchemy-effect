import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface SendMessageBatch<Q = Queue> extends Capability<
  "AWS.SQS.SendMessageBatch",
  Q
> {}

export const SendMessageBatch = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, SendMessageBatch<To<Q>>>
>(Function, "AWS.SQS.SendMessageBatch");

export interface SendMessageBatchEntry<Msg> {
  /**
   * An identifier for a message in this batch used to communicate the result.
   */
  id: string;
  /**
   * The message body.
   */
  message: Msg;
  /**
   * The length of time, in seconds, for which a specific message is delayed.
   */
  delaySeconds?: number;
  /**
   * Message attributes for the message.
   */
  messageAttributes?: SQS.MessageBodyAttributeMap;
  /**
   * The token used for deduplication of messages within a 5-minute minimum deduplication interval.
   * Required for FIFO queues without content-based deduplication.
   */
  messageDeduplicationId?: string;
  /**
   * The tag that specifies that a message belongs to a specific message group.
   * Required for FIFO queues.
   */
  messageGroupId?: string;
}

export const sendMessageBatch = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
  entries: SendMessageBatchEntry<Q["props"]["schema"]["Type"]>[],
) {
  yield* declare<SendMessageBatch<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.sendMessageBatch({
    QueueUrl: url,
    Entries: entries.map((entry) => ({
      Id: entry.id,
      MessageBody: JSON.stringify(entry.message),
      DelaySeconds: entry.delaySeconds,
      MessageAttributes: entry.messageAttributes,
      MessageDeduplicationId: entry.messageDeduplicationId,
      MessageGroupId: entry.messageGroupId,
    })),
  });
});

export const sendMessageBatchFromLambdaFunction = () =>
  SendMessageBatch.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "SendMessageBatch",
          Effect: "Allow",
          Action: ["sqs:SendMessage"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
