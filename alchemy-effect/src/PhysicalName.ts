import * as Effect from "effect/Effect";
import { App } from "./App.ts";
import { InstanceId } from "./InstanceId.ts";
import { base32 } from "./internal/util/base32.ts";

export const createPhysicalName = Effect.fn(function* ({
  id,
  prefix: _prefix,
  // 16 base32 characters = 80 bits of entropy = 4 × 10⁻⁷
  instanceId,
  suffixLength = 16,
  maxLength = 64,
  delimiter = "-",
  lowercase = false,
}: {
  id: string;
  /**
   * Prefix to add to the physical name.
   *
   * @default ${app.name}-${sanitizedId}-${app.stage}-
   */
  prefix?: string;
  /**
   * Hex-encoded instance ID (16 random bytes)
   *
   * @default - the InstanceID set by the engine in Context
   */
  instanceId?: string;
  suffixLength?: number;
  /**
   * Maximum length of the physical name.
   *
   * If the name exceeds this length, the human-friendly portion of the name will be truncated to maxLength-suffixLength
   */
  maxLength?: number;
  /** @default - "-" */
  delimiter?: string;
  /** Whether to lowercase the physical name. @default false */
  lowercase?: boolean;
}) {
  // Always generate DNS-compatible names (letters, numbers, and hyphens only).
  // This ensures physical names work across all services including S3 buckets.
  const sanitize = (name: string) =>
    (lowercase ? name.toLowerCase() : name).replaceAll(
      lowercase ? /[^a-z0-9-]/g : /[^a-zA-Z0-9-]/g,
      delimiter,
    );
  const app = yield* App;
  const prefix =
    _prefix ??
    `${app.name}${delimiter}${id}${delimiter}${app.stage}${delimiter}`;
  const randomId = base32(
    Buffer.from(instanceId ?? (yield* InstanceId), "hex"),
  );
  const suffix = randomId.slice(0, suffixLength);
  const name = `${prefix}${suffix}`;
  if (maxLength && name.length > maxLength) {
    return sanitize(`${prefix.slice(0, maxLength - suffix.length)}${suffix}`);
  }
  return sanitize(name);
});
