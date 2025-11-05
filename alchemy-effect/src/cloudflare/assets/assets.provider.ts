import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import * as Effect from "effect/Effect";
import Ignore from "ignore";
import crypto from "node:crypto";
import { Assets, type AssetsAttr, type AssetsProps } from "./assets.ts";

const MAX_ASSET_SIZE = 1024 * 1024 * 25; // 25MB

export const assetsProvider = () =>
  Assets.provider.effect(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const maybeReadString = Effect.fn(function* (file: string) {
        return yield* fs.readFileString(file).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "SystemError" && error.reason === "NotFound",
            () => Effect.succeed(undefined),
          ),
        );
      });

      const read = Effect.fn(function* <Props extends AssetsProps>(
        props: Props,
      ) {
        const [files, ignore, _headers, _redirects] = yield* Effect.all([
          // todo: glob might be more efficient
          fs.readDirectory(props.directory, { recursive: true }),
          maybeReadString(path.join(props.directory, ".assetsignore")),
          maybeReadString(path.join(props.directory, "_headers")),
          maybeReadString(path.join(props.directory, "_redirects")),
        ]);
        const matcher = yield* Effect.sync(() => {
          const matcher = Ignore().add(["_headers", "_redirects"]);
          if (ignore) {
            matcher.add(ignore);
          }
          return matcher;
        });
        const manifest: Record<string, { hash: string; size: number }> = {};
        yield* Effect.forEach(
          files,
          Effect.fn(function* (name) {
            const file = path.join(props.directory, name);
            if (matcher.ignores(file)) return;
            const stat = yield* fs.stat(file);
            if (stat.type !== "File") return;
            const hash = yield* fs.readFile(file).pipe(
              Effect.map((content) =>
                crypto
                  .createHash("sha256")
                  .update(content + path.extname(file))
                  .digest("hex")
                  .slice(0, 32),
              ),
            );
            const size = Number(stat.size);
            if (size > MAX_ASSET_SIZE) {
              return yield* Effect.fail(
                new Error(
                  `Asset ${name} is too large (the maximum size is ${MAX_ASSET_SIZE / 1024 / 1024} MB; this asset is ${size / 1024 / 1024} MB)`,
                ),
              );
            }
            manifest[name.startsWith("/") ? name : `/${name}`] = { hash, size };
          }),
          { concurrency: "unbounded", discard: true },
        );
        return {
          directory: props.directory,
          config: props.config,
          manifest,
          _headers,
          _redirects,
        } as AssetsAttr<Props>;
      });

      return {
        // todo: diff
        create({ news }) {
          return read(news);
        },
        update({ news }) {
          return read(news);
        },
        delete() {
          return Effect.succeed(undefined);
        },
      };
    }),
  );
