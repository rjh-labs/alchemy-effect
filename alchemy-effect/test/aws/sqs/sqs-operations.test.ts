import * as AWS from "@/aws";
import { apply, destroy } from "@/index";
import { test } from "@/test";
import { expect } from "@effect/vitest";
import * as Lambda from "distilled-aws/lambda";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";
import { SqsOperationsFunction, TestQueue } from "./sqs-operations.handler.ts";

// Helper to invoke the Lambda and parse the response
const invokeLambda = (functionArn: string, payload: { operation: string; payload?: unknown }) =>
  Effect.gen(function* () {
    const response = yield* Lambda.invoke({
      FunctionName: functionArn,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(payload),
    });

    // Consume the streaming payload
    let payloadBytes: Uint8Array | undefined;
    if (response.Payload) {
      const chunks = yield* Stream.runCollect(response.Payload);
      const chunksArray = Chunk.toArray(chunks);
      const totalLength = chunksArray.reduce((sum: number, chunk: Uint8Array) => sum + chunk.length, 0);
      payloadBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunksArray) {
        payloadBytes.set(chunk, offset);
        offset += chunk.length;
      }
    }

    if (response.FunctionError) {
      throw new Error(`Lambda error: ${response.FunctionError} - ${payloadBytes ? new TextDecoder().decode(payloadBytes) : "unknown"}`);
    }

    const resultStr = payloadBytes ? new TextDecoder().decode(payloadBytes) : "{}";
    return JSON.parse(resultStr) as {
      success: boolean;
      operation: string;
      result?: unknown;
      error?: string;
    };
  });

// Wait for Lambda to be ready (cold start can take a few seconds)
const waitForLambdaReady = (functionArn: string) =>
  Effect.gen(function* () {
    yield* invokeLambda(functionArn, { operation: "getQueueAttributes", payload: { attributeNames: ["All"] } }).pipe(
      Effect.retry({
        schedule: Schedule.exponential(1000).pipe(Schedule.intersect(Schedule.recurs(10))),
      }),
    );
  });

test.skipIf(!!process.env.FAST)(
  "SQS data plane operations via Lambda",
  { timeout: 300_000 },
  Effect.gen(function* () {
    // Deploy the queue and Lambda function
    const stack = yield* apply(TestQueue, SqsOperationsFunction);

    const functionArn = stack.SqsOperationsFunction.functionArn;

    // Wait for Lambda to be ready
    yield* waitForLambdaReady(functionArn);

    // Test 1: sendMessage
    console.log("Testing sendMessage...");
    const sendResult = yield* invokeLambda(functionArn, {
      operation: "sendMessage",
      payload: { id: "msg-1", data: "test message 1" },
    });
    expect(sendResult.success).toBe(true);
    expect(sendResult.result).toBeDefined();
    expect((sendResult.result as { messageId: string }).messageId).toBeDefined();
    console.log("sendMessage: OK");

    // Test 2: sendMessageBatch
    console.log("Testing sendMessageBatch...");
    const batchSendResult = yield* invokeLambda(functionArn, {
      operation: "sendMessageBatch",
      payload: [
        { id: "batch-1", message: { id: "msg-2", data: "batch message 1" } },
        { id: "batch-2", message: { id: "msg-3", data: "batch message 2" } },
      ],
    });
    expect(batchSendResult.success).toBe(true);
    expect((batchSendResult.result as { successful: unknown[] }).successful).toHaveLength(2);
    console.log("sendMessageBatch: OK");

    // Test 3: receiveMessage
    console.log("Testing receiveMessage...");
    const receiveResult = yield* invokeLambda(functionArn, {
      operation: "receiveMessage",
      payload: { maxNumberOfMessages: 10, waitTimeSeconds: 1 },
    });
    expect(receiveResult.success).toBe(true);
    const messages = (receiveResult.result as { messages: Array<{ ReceiptHandle: string; Body: string }> }).messages;
    expect(messages).toBeDefined();
    expect(messages.length).toBeGreaterThan(0);
    console.log(`receiveMessage: OK (received ${messages?.length ?? 0} messages)`);

    // Test 4: changeMessageVisibility (if we have messages)
    if (messages && messages.length > 0) {
      const firstMessage = messages[0];
      console.log("Testing changeMessageVisibility...");
      const changeVisibilityResult = yield* invokeLambda(functionArn, {
        operation: "changeMessageVisibility",
        payload: {
          receiptHandle: firstMessage.ReceiptHandle,
          visibilityTimeout: 60,
        },
      });
      expect(changeVisibilityResult.success).toBe(true);
      console.log("changeMessageVisibility: OK");

      // Test 5: changeMessageVisibilityBatch
      if (messages.length > 1) {
        console.log("Testing changeMessageVisibilityBatch...");
        const changeVisibilityBatchResult = yield* invokeLambda(functionArn, {
          operation: "changeMessageVisibilityBatch",
          payload: messages.slice(0, 2).map((m, i) => ({
            id: `change-${i}`,
            receiptHandle: m.ReceiptHandle,
            visibilityTimeout: 30,
          })),
        });
        expect(changeVisibilityBatchResult.success).toBe(true);
        console.log("changeMessageVisibilityBatch: OK");
      }

      // Test 6: deleteMessage
      console.log("Testing deleteMessage...");
      const deleteResult = yield* invokeLambda(functionArn, {
        operation: "deleteMessage",
        payload: { receiptHandle: firstMessage.ReceiptHandle },
      });
      expect(deleteResult.success).toBe(true);
      console.log("deleteMessage: OK");

      // Test 7: deleteMessageBatch (delete remaining messages)
      if (messages.length > 1) {
        console.log("Testing deleteMessageBatch...");
        const deleteBatchResult = yield* invokeLambda(functionArn, {
          operation: "deleteMessageBatch",
          payload: messages.slice(1).map((m, i) => ({
            id: `delete-${i}`,
            receiptHandle: m.ReceiptHandle,
          })),
        });
        expect(deleteBatchResult.success).toBe(true);
        console.log("deleteMessageBatch: OK");
      }
    }

    // Test 8: getQueueAttributes
    console.log("Testing getQueueAttributes...");
    const getAttrsResult = yield* invokeLambda(functionArn, {
      operation: "getQueueAttributes",
      payload: { attributeNames: ["All"] },
    });
    expect(getAttrsResult.success).toBe(true);
    const attributes = (getAttrsResult.result as { attributes: Record<string, string> }).attributes;
    expect(attributes).toBeDefined();
    expect(attributes.VisibilityTimeout).toBe("30");
    console.log("getQueueAttributes: OK");

    // Test 9: Send more messages then purgeQueue
    console.log("Sending messages for purge test...");
    yield* invokeLambda(functionArn, {
      operation: "sendMessage",
      payload: { id: "purge-test-1", data: "message to purge" },
    });
    yield* invokeLambda(functionArn, {
      operation: "sendMessage",
      payload: { id: "purge-test-2", data: "another message to purge" },
    });

    console.log("Testing purgeQueue...");
    const purgeResult = yield* invokeLambda(functionArn, {
      operation: "purgeQueue",
    });
    expect(purgeResult.success).toBe(true);
    console.log("purgeQueue: OK");

    // Wait a moment for purge to complete, then verify queue is empty
    yield* Effect.sleep(2000);
    const verifyPurgeResult = yield* invokeLambda(functionArn, {
      operation: "receiveMessage",
      payload: { maxNumberOfMessages: 10, waitTimeSeconds: 1 },
    });
    expect(verifyPurgeResult.success).toBe(true);
    const remainingMessages = (verifyPurgeResult.result as { messages?: unknown[] }).messages;
    expect(remainingMessages?.length ?? 0).toBe(0);
    console.log("Verified queue is empty after purge");

    console.log("\nAll SQS data plane operations tests passed!");

    // Cleanup
    yield* destroy();
  }).pipe(Effect.provide(AWS.providers())),
);
