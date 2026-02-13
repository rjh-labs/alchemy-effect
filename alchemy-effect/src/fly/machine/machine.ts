import { Resource } from "../../resource.ts";

export type MachineConfig = {
  /**
   * Docker image to run.
   */
  image: string;
  /**
   * Environment variables.
   */
  env?: Record<string, string>;
  /**
   * Service configuration for exposing ports.
   */
  services?: Array<{
    ports: Array<{
      port: number;
      handlers?: string[];
    }>;
    protocol?: "tcp" | "udp";
    internal_port?: number;
  }>;
  /**
   * Guest VM configuration.
   */
  guest?: {
    cpus?: number;
    memory_mb?: number;
    cpu_kind?: "shared" | "performance";
  };
};

export type MachineProps = {
  /**
   * App name where this machine will be created.
   */
  app: string;
  /**
   * Machine configuration.
   */
  config: MachineConfig;
  /**
   * Region where the machine will be created.
   * If not specified, uses the app's primary region.
   */
  region?: string;
  /**
   * Machine name (optional, generated if not provided).
   */
  name?: string;
};

export type MachineAttr<Props extends MachineProps> = {
  machineId: string;
  instanceId: string;
  state: string;
  region: string;
  name: string;
  app: string;
};

/**
 * A Fly.io Machine (VM instance).
 *
 * Machines are lightweight VMs that run your application code.
 *
 * @section Creating a Machine
 * @example Basic Web Server
 * ```typescript
 * const machine = yield* Machine("web-server", {
 *   app: "my-app",
 *   config: {
 *     image: "nginx:latest",
 *     guest: {
 *       cpus: 1,
 *       memory_mb: 256,
 *     },
 *     services: [
 *       {
 *         ports: [{ port: 80, handlers: ["http"] }],
 *         internal_port: 80,
 *       },
 *     ],
 *   },
 *   region: "iad",
 * });
 * ```
 */
export interface Machine<
  ID extends string = string,
  Props extends MachineProps = MachineProps,
> extends Resource<"Fly.Machine", ID, Props, MachineAttr<Props>, Machine> {}

export const Machine = Resource<{
  <const ID extends string, const Props extends MachineProps>(
    id: ID,
    props: Props,
  ): Machine<ID, Props>;
}>("Fly.Machine");
