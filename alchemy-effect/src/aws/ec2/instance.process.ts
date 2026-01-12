import * as Effect from "effect/Effect";
import * as Instance from "./instance.ts";

/**
 * Create an EC2 instance that runs a long-running process.
 *
 * The process will run continuously on the instance and be managed by systemd.
 * If the process exits, it will be automatically restarted.
 *
 * @example
 * ```typescript
 * import * as EC2 from "alchemy-effect/aws/ec2";
 * import * as Effect from "effect/Effect";
 *
 * class MyWorker extends EC2.Instance.process("my-worker", {
 *   run: Effect.gen(function* () {
 *     while (true) {
 *       yield* processItems();
 *       yield* Effect.sleep("1 minute");
 *     }
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
export const process =
  <const ID extends string, Req>(
    id: ID,
    {
      run,
    }: {
      /**
       * The Effect to run as a long-running process.
       * This Effect will be executed when the instance starts.
       * The process should run indefinitely (e.g., using Effect.never or a while loop).
       */
      run: Effect.Effect<void, never, Req>;
    },
  ) =>
  <const Props extends Instance.InstanceProps.Simplified<Req>>(props: Props) =>
    Instance.Instance(id, { handle: () => run })(props);
