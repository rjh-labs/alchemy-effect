import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Runtime from "effect/Runtime";
import fs from "node:fs";
import path from "node:path";

/**
 * Load environment variables from /opt/app/.env file.
 * This is called automatically by the bootstrap script,
 * but can be called manually if needed.
 */
export const loadEnv = () => {
  try {
    const envPath = "/opt/app/.env";
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          // Handle: export KEY="value" or KEY="value" or KEY=value
          const match = trimmed.match(
            /^(?:export\s+)?([^=]+)=(?:"([^"]*)"|'([^']*)'|(.*))/,
          );
          if (match) {
            const key = match[1].trim();
            const value = match[2] ?? match[3] ?? match[4] ?? "";
            process.env[key] = value;
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to load .env file:", error);
  }
};

/**
 * Register a handler for graceful shutdown.
 * The handler will be called when the process receives SIGTERM or SIGINT.
 *
 * @example
 * ```typescript
 * onShutdown(Effect.gen(function* () {
 *   yield* closeDatabase();
 *   yield* flushMetrics();
 * }));
 * ```
 */
export const onShutdown = <E, R>(
  handler: Effect.Effect<void, E, R>,
  runtime?: Runtime.Runtime<R>,
) => {
  const run = runtime
    ? (effect: Effect.Effect<void, E, R>) =>
        Runtime.runPromise(runtime)(effect as Effect.Effect<void, never, R>)
    : (effect: Effect.Effect<void, E, R>) =>
        Effect.runPromise(effect as Effect.Effect<void, never, never>);

  const shutdown = async () => {
    console.log("Shutting down...");
    try {
      await run(handler);
      console.log("Shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

/**
 * Convert an Effect-based handler to a runnable function for EC2.
 * This is simpler than Lambda's toHandler since we just run the Effect directly.
 *
 * @example
 * ```typescript
 * import * as EC2 from "alchemy-effect/aws/ec2";
 *
 * class MyWorker extends EC2.Instance.process("my-worker", {
 *   run: Effect.gen(function* () {
 *     // Long-running process
 *   }),
 * })({
 *   main: import.meta.filename,
 *   subnetId: mySubnet.attr.subnetId,
 *   securityGroupIds: [mySg.attr.groupId],
 *   bindings: $(),
 * }) {}
 *
 * export default MyWorker.handler.pipe(EC2.toHandler);
 * ```
 */
export const toHandler = <E, R>(
  effect: Effect.Effect<void, E, R>,
): (() => Promise<void>) => {
  // Load environment variables
  loadEnv();

  return async () => {
    try {
      // Run the Effect
      await Effect.runPromise(effect as Effect.Effect<void, never, never>);
    } catch (error) {
      console.error("Handler error:", error);
      process.exit(1);
    }
  };
};

/**
 * A version of toHandler that accepts a Layer for dependency injection.
 *
 * @example
 * ```typescript
 * import * as EC2 from "alchemy-effect/aws/ec2";
 * import * as Layer from "effect/Layer";
 *
 * const AppLayer = Layer.mergeAll(DatabaseLayer, CacheLayer);
 *
 * class MyWorker extends EC2.Instance.process("my-worker", {
 *   run: Effect.gen(function* () {
 *     const db = yield* Database;
 *     // ...
 *   }),
 * })({...}) {}
 *
 * export default MyWorker.handler.pipe(
 *   EC2.toHandlerWith(AppLayer)
 * );
 * ```
 */
export const toHandlerWith =
  <ROut, E2, RIn>(layer: Layer.Layer<ROut, E2, RIn>) =>
  <E, R extends ROut>(
    effect: Effect.Effect<void, E, R>,
  ): (() => Promise<void>) => {
    // Load environment variables
    loadEnv();

    return async () => {
      try {
        // Run the Effect with the provided layer
        await Effect.runPromise(
          effect.pipe(Effect.provide(layer)) as Effect.Effect<
            void,
            never,
            never
          >,
        );
      } catch (error) {
        console.error("Handler error:", error);
        process.exit(1);
      }
    };
  };
