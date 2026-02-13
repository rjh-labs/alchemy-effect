import { Resource } from "../../resource.ts";

export type SecretProps = {
  /**
   * App name where the secret will be set.
   */
  app: string;
  /**
   * Secret key/name.
   */
  key: string;
  /**
   * Secret value.
   */
  value: string;
};

export type SecretAttr<Props extends SecretProps> = {
  app: string;
  key: string;
  /**
   * Whether the secret has been deployed to the app.
   */
  deployed: boolean;
  /**
   * Digest of the secret value (not the value itself).
   */
  digest: string;
};

/**
 * A Fly.io secret (encrypted environment variable).
 *
 * Secrets are encrypted environment variables that are made available to your app.
 *
 * @section Setting Secrets
 * @example Database Connection String
 * ```typescript
 * const dbSecret = yield* Secret("db-url", {
 *   app: "my-app",
 *   key: "DATABASE_URL",
 *   value: "postgres://...",
 * });
 * ```
 */
export interface Secret<
  ID extends string = string,
  Props extends SecretProps = SecretProps,
> extends Resource<"Fly.Secret", ID, Props, SecretAttr<Props>, Secret> {}

export const Secret = Resource<{
  <const ID extends string, const Props extends SecretProps>(
    id: ID,
    props: Props,
  ): Secret<ID, Props>;
}>("Fly.Secret");
