import { $ } from "@/index";
import * as Lambda from "@/aws/lambda";
import * as SQS from "@/aws/sqs";
import * as Effect from "effect/Effect";
import * as S from "effect/Schema";

// Define the test queue with a schema for messages
export class TestQueue extends SQS.Queue("TestQueue", {
  schema: S.Struct({
    id: S.String,
    data: S.String,
  }),
  visibilityTimeout: 30,
}) {}

// Define the request type for our test Lambda
interface TestRequest {
  operation: string;
  payload?: unknown;
}

// Lambda function that tests all SQS operations
export class SqsOperationsFunction extends Lambda.Function("SqsOperationsFunction", {
  handle: Effect.fn(function* (event: TestRequest) {
    const operation = event.operation;
    const payload = event.payload;

    try {
      switch (operation) {
        case "sendMessage": {
          const result = yield* SQS.sendMessage(TestQueue, payload as { id: string; data: string });
          return { success: true, operation, result: { messageId: result.MessageId } };
        }

        case "sendMessageBatch": {
          const entries = payload as Array<{ id: string; message: { id: string; data: string } }>;
          const result = yield* SQS.sendMessageBatch(TestQueue, entries);
          return { success: true, operation, result: { successful: result.Successful, failed: result.Failed } };
        }

        case "receiveMessage": {
          const options = payload as SQS.ReceiveMessageOptions | undefined;
          const result = yield* SQS.receiveMessage(TestQueue, options);
          return { success: true, operation, result: { messages: result.Messages } };
        }

        case "deleteMessage": {
          const { receiptHandle } = payload as { receiptHandle: string };
          yield* SQS.deleteMessage(TestQueue, { receiptHandle });
          return { success: true, operation };
        }

        case "deleteMessageBatch": {
          const entries = payload as SQS.DeleteMessageBatchEntry[];
          const result = yield* SQS.deleteMessageBatch(TestQueue, entries);
          return { success: true, operation, result: { successful: result.Successful, failed: result.Failed } };
        }

        case "changeMessageVisibility": {
          const { receiptHandle, visibilityTimeout } = payload as { receiptHandle: string; visibilityTimeout: number };
          yield* SQS.changeMessageVisibility(TestQueue, { receiptHandle, visibilityTimeout });
          return { success: true, operation };
        }

        case "changeMessageVisibilityBatch": {
          const entries = payload as SQS.ChangeMessageVisibilityBatchEntry[];
          const result = yield* SQS.changeMessageVisibilityBatch(TestQueue, entries);
          return { success: true, operation, result: { successful: result.Successful, failed: result.Failed } };
        }

        case "getQueueAttributes": {
          const options = payload as SQS.GetQueueAttributesOptions | undefined;
          const result = yield* SQS.getQueueAttributes(TestQueue, options);
          return { success: true, operation, result: { attributes: result.Attributes } };
        }

        case "purgeQueue": {
          yield* SQS.purgeQueue(TestQueue);
          return { success: true, operation };
        }

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      return { success: false, operation, error: String(error) };
    }
  }),
})({
  main: import.meta.filename,
  bindings: $(
    SQS.SendMessage(TestQueue),
    SQS.SendMessageBatch(TestQueue),
    SQS.ReceiveMessage(TestQueue),
    SQS.DeleteMessage(TestQueue),
    SQS.DeleteMessageBatch(TestQueue),
    SQS.ChangeMessageVisibility(TestQueue),
    SQS.ChangeMessageVisibilityBatch(TestQueue),
    SQS.GetQueueAttributes(TestQueue),
    SQS.PurgeQueue(TestQueue),
  ),
  memory: 256,
  timeout: 30,
}) {}

// Runtime handler export
export default SqsOperationsFunction.handler.pipe(Lambda.toHandler);
