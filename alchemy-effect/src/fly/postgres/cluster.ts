import { Resource } from "../../resource.ts";

export type PostgresProps = {
  /**
   * App name for the Postgres cluster.
   * If not provided, a unique name will be generated.
   */
  appName?: string;
  /**
   * Region where the cluster will be created.
   * @default "iad" (Ashburn, Virginia)
   */
  region?: string;
  /**
   * VM size for the cluster.
   * @default "shared-cpu-1x"
   */
  vmSize?: string;
  /**
   * Volume size in GB.
   * @default 10
   */
  volumeSize?: number;
  /**
   * Initial cluster size (number of instances).
   * @default 1
   */
  initialClusterSize?: number;
};

export type PostgresAttr<Props extends PostgresProps> = {
  connectionString: string;
  appName: Props["appName"] extends string ? Props["appName"] : string;
  hostname: string;
};

/**
 * A Fly.io Postgres cluster.
 *
 * Managed Postgres database running on Fly.io infrastructure.
 *
 * @section Creating a Postgres Cluster
 * @example Basic Postgres Database
 * ```typescript
 * const db = yield* Postgres("my-db", {
 *   appName: "my-app-db",
 *   region: "iad",
 *   volumeSize: 10,
 * });
 *
 * // Use connection string
 * console.log(db.connectionString);
 * ```
 */
export interface Postgres<
  ID extends string = string,
  Props extends PostgresProps = PostgresProps,
> extends Resource<
    "Fly.Postgres",
    ID,
    Props,
    PostgresAttr<Props>,
    Postgres
  > {}

export const Postgres = Resource<{
  <const ID extends string, const Props extends PostgresProps>(
    id: ID,
    props?: Props,
  ): Postgres<ID, Props>;
}>("Fly.Postgres");
