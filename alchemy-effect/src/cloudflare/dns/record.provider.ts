import type { DNS } from "cloudflare/resources";
import * as Effect from "effect/Effect";
import { CloudflareApi } from "../api.ts";
import {
  DnsRecord,
  type DnsRecordAttr,
  type DnsRecordItem,
  type DnsRecordProps,
} from "./record.ts";

export const recordProvider = () =>
  DnsRecord.provider.effect(
    Effect.gen(function* () {
      const api = yield* CloudflareApi;

      const convertRecord = (
        record: DNS.RecordResponse,
      ): DnsRecordItem & { id: string; createdAt: number; modifiedAt: number } => ({
        id: record.id,
        name: record.name,
        type: record.type as DnsRecordItem["type"],
        content: record.content ?? "",
        ttl: record.ttl,
        proxied: record.proxied ?? false,
        priority: "priority" in record ? record.priority : undefined,
        comment: record.comment,
        createdAt: new Date(record.created_on).getTime(),
        modifiedAt: new Date(record.modified_on).getTime(),
      });

      const createOrUpdateRecord = Effect.fnUntraced(function* ({
        zoneId,
        record,
        existingId,
      }: {
        zoneId: string;
        record: DnsRecordItem;
        existingId?: string;
      }) {
        const payload = {
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl ?? 1,
          proxied: record.proxied ?? false,
          priority: record.priority,
          comment: record.comment,
        };

        if (existingId) {
          // Update existing record
          const updated = yield* api.dns.records
            .update(existingId, {
              zone_id: zoneId,
              ...payload,
            })
            .pipe(
              // If record doesn't exist, fall back to creation
              Effect.catchTag("NotFound", () =>
                api.dns.records.create({
                  zone_id: zoneId,
                  ...payload,
                }),
              ),
            );
          return convertRecord(updated);
        }

        // Create new record
        const created = yield* api.dns.records.create({
          zone_id: zoneId,
          ...payload,
        });
        return convertRecord(created);
      });

      const deduplicateRecords = (
        records: DnsRecordItem[],
      ): DnsRecordItem[] => {
        const seen = new Map<string, DnsRecordItem>();
        for (const record of records) {
          // For record types that can have multiple entries with the same name
          // (MX, TXT, NS, SRV, CAA), include content/priority in the key
          let key = `${record.name}-${record.type}`;
          if (["MX", "TXT", "NS", "SRV", "CAA"].includes(record.type)) {
            if (record.type === "MX" || record.type === "SRV") {
              key = `${key}-${record.priority}-${record.content}`;
            } else {
              key = `${key}-${record.content}`;
            }
          }
          seen.set(key, record);
        }
        return Array.from(seen.values());
      };

      return {
        create: Effect.fnUntraced(function* ({ news }) {
          const uniqueRecords = deduplicateRecords(news.records);

          // Check for existing records before creating (idempotency)
          const created = yield* Effect.all(
            uniqueRecords.map((record) =>
              Effect.gen(function* () {
                // List existing records with matching name and type
                const existing = yield* api.dns.records
                  .list({
                    zone_id: news.zoneId,
                    type: record.type,
                    name: { exact: record.name },
                  })
                  .pipe(Effect.map((response) => response.result[0]));

                return yield* createOrUpdateRecord({
                  zoneId: news.zoneId,
                  record,
                  existingId: existing?.id,
                });
              }),
            ),
            { concurrency: 5 },
          );

          return {
            zoneId: news.zoneId,
            records: created,
          } satisfies DnsRecordAttr<DnsRecordProps>;
        }),

        update: Effect.fnUntraced(function* ({ news, output }) {
          const currentRecords = output.records;
          const desiredRecords = deduplicateRecords(news.records);

          // Find records to delete (exist in current but not in desired)
          const recordsToDelete = currentRecords.filter(
            (current) =>
              !desiredRecords.some(
                (desired) =>
                  desired.name === current.name && desired.type === current.type,
              ),
          );

          // Delete orphaned records
          yield* Effect.all(
            recordsToDelete.map((record) =>
              api.dns.records
                .delete(record.id, { zone_id: output.zoneId })
                .pipe(Effect.catchTag("NotFound", () => Effect.void)),
            ),
            { concurrency: 5 },
          );

          // Update or create records
          const updated = yield* Effect.all(
            desiredRecords.map((desired) =>
              Effect.gen(function* () {
                // Find matching existing record by (name, type)
                const existing = currentRecords.find(
                  (current) =>
                    current.name === desired.name &&
                    current.type === desired.type,
                );

                // Check if any properties changed
                const needsUpdate = existing
                  ? existing.content !== desired.content ||
                    existing.ttl !== (desired.ttl ?? 1) ||
                    existing.proxied !== (desired.proxied ?? false) ||
                    existing.priority !== desired.priority ||
                    existing.comment !== desired.comment
                  : true;

                if (needsUpdate) {
                  return yield* createOrUpdateRecord({
                    zoneId: news.zoneId,
                    record: desired,
                    existingId: existing?.id,
                  });
                }

                // No changes needed, return existing
                return existing!;
              }),
            ),
            { concurrency: 5 },
          );

          return {
            zoneId: news.zoneId,
            records: updated,
          } satisfies DnsRecordAttr<DnsRecordProps>;
        }),

        delete: Effect.fnUntraced(function* ({ output }) {
          // Delete all managed records
          yield* Effect.all(
            output.records.map((record) =>
              api.dns.records
                .delete(record.id, { zone_id: output.zoneId })
                .pipe(Effect.catchTag("NotFound", () => Effect.void)),
            ),
            { concurrency: 5 },
          );
        }),

        read: Effect.fnUntraced(function* ({ output }) {
          if (!output) return undefined;

          // Verify all records still exist
          const records = yield* Effect.all(
            output.records.map((record) =>
              api.dns.records
                .get(record.id, { zone_id: output.zoneId })
                .pipe(
                  Effect.map(convertRecord),
                  Effect.catchTag("NotFound", () => Effect.succeed(undefined)),
                ),
            ),
            { concurrency: 5 },
          );

          // Filter out deleted records
          const existing = records.filter(
            (r): r is NonNullable<typeof r> => r !== undefined,
          );

          if (existing.length === 0) return undefined;

          return {
            zoneId: output.zoneId,
            records: existing,
          } satisfies DnsRecordAttr<DnsRecordProps>;
        }),
      };
    }),
  );
