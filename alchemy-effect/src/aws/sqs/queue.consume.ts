import { App, Binding, type Capability, type From } from "alchemy-effect";
import type * as lambda from "aws-lambda";
import * as Effect from "effect/Effect";
import type * as Lambda from "itty-aws/lambda";
import { Account } from "../account.ts";
import { Function, LambdaClient } from "../lambda/index.ts";
import { Region } from "../region.ts";
import { SQSClient } from "./client.ts";
import { Queue } from "./queue.ts";

export type QueueRecord<Data> = Omit<lambda.SQSRecord, "body"> & {
  body: Data;
};

export type QueueEvent<Data> = Omit<lambda.SQSEvent, "Records"> & {
  Records: QueueRecord<Data>[];
};

export interface Consume<Q = Queue> extends Capability<"AWS.SQS.Consume", Q> {}

export interface QueueEventSourceProps {
  batchSize?: number;
  maxBatchingWindow?: number;
  scalingConfig?: Lambda.ScalingConfig;
}

export const QueueEventSource = Binding<
  <Q extends Queue, const Props extends QueueEventSourceProps>(
    queue: Q,
    props?: Props,
  ) => Binding<Function, Consume<From<Q>>, Props, "QueueEventSource">
>(Function, "AWS.SQS.Consume", "QueueEventSource");

export const consumeFromLambdaFunction = () =>
  QueueEventSource.provider.effect(
    Effect.gen(function* () {
      const app = yield* App;
      const region = yield* Region;
      const accountId = yield* Account;
      const sqs = yield* SQSClient;
      const lambda = yield* LambdaClient;
      return {
        attach: Effect.fn(function* ({
          source: queue,
          props: { batchSize, maxBatchingWindow, scalingConfig } = {},
          target,
        }) {
          // uh-oh, will this fail?
          yield* lambda
            .createEventSourceMapping({
              FunctionName: target.attr.functionName,
              EventSourceArn: queue.attr.queueArn,
              BatchSize: batchSize,
              MaximumBatchingWindowInSeconds: maxBatchingWindow,
              ScalingConfig: scalingConfig,
              Enabled: true,
              FunctionResponseTypes: ["ReportBatchItemFailures"],
              // https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html#event-source-mapping-metrics
              MetricsConfig: { Metrics: ["EventCount"] },
              // KMSKeyArn: (encrypted FilterCriteria)

              // See: https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
              // FilterCriteria: {
              //   Filters: [{Pattern: ""}]
              // }
            })
            .pipe(Effect.catchAll(() => Effect.void));
          return {
            policyStatements: [
              {
                Sid: "AWS.SQS.Consume",
                Effect: "Allow",
                Action: [
                  "sqs:ReceiveMessage",
                  "sqs:DeleteMessage",
                  "sqs:ChangeMessageVisibility",
                ],
                Resource: [queue.attr.queueArn],
              },
            ],
          };
        }),
      };
    }),
  );
