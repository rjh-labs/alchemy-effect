import * as Effect from "effect/Effect";

import * as SQS from "distilled-aws/sqs";
import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import { toEnvKey } from "../../env.ts";
import { declare, type To } from "../../policy.ts";
import { Function } from "../lambda/function.ts";
import { Queue } from "./queue.ts";

export interface GetQueueAttributes<Q = Queue> extends Capability<
  "AWS.SQS.GetQueueAttributes",
  Q
> {}

export const GetQueueAttributes = Binding<
  <Q extends Queue>(queue: Q) => Binding<Function, GetQueueAttributes<To<Q>>>
>(Function, "AWS.SQS.GetQueueAttributes");

export interface GetQueueAttributesOptions {
  /**
   * A list of attributes for which to retrieve information.
   * Use "All" to retrieve all attributes.
   */
  attributeNames?: SQS.QueueAttributeName[];
}

export const getQueueAttributes = Effect.fnUntraced(function* <Q extends Queue>(
  queue: Q,
  options?: GetQueueAttributesOptions,
) {
  yield* declare<GetQueueAttributes<To<Q>>>();
  const url = process.env[toEnvKey(queue.id, "QUEUE_URL")]!;
  return yield* SQS.getQueueAttributes({
    QueueUrl: url,
    AttributeNames: options?.attributeNames,
  });
});

export const getQueueAttributesFromLambdaFunction = () =>
  GetQueueAttributes.provider.succeed({
    attach: ({ source: queue }) => ({
      env: {
        [toEnvKey(queue.id, "QUEUE_URL")]: queue.attr.queueUrl,
      },
      policyStatements: [
        {
          Sid: "GetQueueAttributes",
          Effect: "Allow",
          Action: ["sqs:GetQueueAttributes"],
          Resource: [queue.attr.queueArn],
        },
      ],
    }),
  });
