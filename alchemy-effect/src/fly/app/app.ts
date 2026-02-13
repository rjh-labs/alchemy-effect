import { Resource } from "../../resource.ts";

export type AppProps = {
  /**
   * App name. Must be unique within the organization.
   * If not provided, a unique name will be generated.
   */
  name?: string;
  /**
   * Fly.io organization name.
   * If not provided, uses the org from stage config.
   */
  org?: string;
  /**
   * Primary region for the app.
   * @default "iad" (Ashburn, Virginia)
   */
  primaryRegion?: string;
};

export type AppAttr<Props extends AppProps> = {
  appName: Props["name"] extends string ? Props["name"] : string;
  org: string;
  hostname: string;
};

/**
 * A Fly.io application.
 *
 * Apps are the top-level container for Machines, Volumes, and other resources.
 *
 * @section Creating an App
 * @example Basic App
 * ```typescript
 * const app = yield* App("my-app", {
 *   org: "my-org",
 *   primaryRegion: "iad",
 * });
 * ```
 */
export interface App<
  ID extends string = string,
  Props extends AppProps = AppProps,
> extends Resource<"Fly.App", ID, Props, AppAttr<Props>, App> {}

export const App = Resource<{
  <const ID extends string, const Props extends AppProps>(
    id: ID,
    props?: Props,
  ): App<ID, Props>;
}>("Fly.App");
