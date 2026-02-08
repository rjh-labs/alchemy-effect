import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type { SQLiteConnection } from "./SQLiteConnection.ts";
import type { SqliteErrorType } from "./SQLiteError.ts";

export class Sqlite extends Context.Tag("Sqlite")<Sqlite, SqliteService>() {}

/**
 * SQLite service that provides database connection factory.
 */
export interface SqliteService {
  /**
   * Open a SQLite database at the given path.
   */
  open(path: string): Effect.Effect<SQLiteConnection, SqliteErrorType>;
}
