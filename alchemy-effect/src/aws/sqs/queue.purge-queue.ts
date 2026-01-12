import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface PurgeQueue<Q = Queue> extends Capability<
  "AWS.SQS.PurgeQueue",
  Q
> {}

export const PurgeQueue = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, PurgeQueue<To<Q>>>
>(Function, "AWS.SQS.PurgeQueue");

export const purgeQueue = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
) {
  yield* declare<PurgeQueue<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.purgeQueue({
    QueueUrl: url,
  });
});

export const purgeQueueFromLambdaFunction = () =>
  PurgeQueue.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "PurgeQueue",
          Effect: "Allow",
          Action: ["sqs:PurgeQueue"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
