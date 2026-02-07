import type {
  Context as LambdaContext,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";
import { declare, type From } from "../../../Capability.ts";
import type { Consume, Queue, QueueEvent } from "../../SQS/Queue.ts";
import * as Lambda from "../Function.ts";
import { QueueEventSource } from "../QueueEventSource.ts";

export const consumeQueue =
  <Q extends Queue, ID extends string, Req>(
    id: ID,
    {
      queue,
      handle,
    }: {
      queue: Q;
      handle: (
        event: QueueEvent<Q["props"]["schema"]["Type"]>,
        context: LambdaContext,
      ) => Effect.Effect<SQSBatchResponse | void, never, Req>;
    },
  ) =>
  <const Props extends Lambda.FunctionProps<Req>>({
    bindings,
    ...props
  }: Props) =>
    Lambda.Function(id, {
      handle: Effect.fn(function* (event: SQSEvent, context: LambdaContext) {
        yield* declare<Consume<From<Q>>>();
        const records = yield* Effect.all(
          event.Records.map(
            Effect.fn(function* (record) {
              return {
                ...record,
                body: yield* S.validate(queue.props.schema)(record.body).pipe(
                  Effect.catchAll(() => Effect.void),
                ),
              };
            }),
          ),
        );
        const response = yield* handle(
          {
            Records: records.filter((record) => record.body !== undefined),
          },
          context,
        );
        return {
          batchItemFailures: [
            ...(response?.batchItemFailures ?? []),
            ...records
              .filter((record) => record.body === undefined)
              .map((failed) => ({
                itemIdentifier: failed.messageId,
              })),
          ],
        } satisfies SQSBatchResponse;
      }),
    })({ ...props, bindings: bindings.and(QueueEventSource(queue)) });
