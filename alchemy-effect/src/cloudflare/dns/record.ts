import { Resource } from "../../resource.ts";

export type DnsRecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "MX"
  | "TXT"
  | "NS"
  | "SRV"
  | "CAA";

export type DnsRecordItem = {
  name: string;
  type: DnsRecordType;
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
};

export type DnsRecordProps = {
  /**
   * Cloudflare Zone ID where DNS records will be managed.
   */
  zoneId: string;
  /**
   * Array of DNS records to create/manage in this zone.
   * Records are identified by (name, type) pair.
   * - For single-value record types (A, AAAA, CNAME): only one record per (name, type)
   * - For multi-value record types (MX, TXT, NS, SRV, CAA): multiple records allowed per name
   */
  records: DnsRecordItem[];
};

export type DnsRecordAttr<Props extends DnsRecordProps> = {
  zoneId: string;
  /**
   * Created/updated DNS records with Cloudflare metadata.
   */
  records: Array<
    DnsRecordItem & {
      id: string;
      createdAt: number;
      modifiedAt: number;
    }
  >;
};

/**
 * Manages a batch of DNS records in a Cloudflare zone.
 *
 * Handles create/update/delete with automatic orphan cleanup on update.
 * Supports all common DNS record types including multi-value types (MX, TXT, etc.).
 *
 * @section Creating DNS Records
 * @example Basic A and CNAME Records
 * ```typescript
 * const dns = yield* DnsRecord("example-dns", {
 *   zoneId: "abc123...",
 *   records: [
 *     { name: "www.example.com", type: "A", content: "192.0.2.1", proxied: true },
 *     { name: "blog.example.com", type: "CNAME", content: "www.example.com", proxied: true },
 *   ],
 * });
 * ```
 *
 * @example MX Records for Email
 * ```typescript
 * const email = yield* DnsRecord("example-email", {
 *   zoneId: "abc123...",
 *   records: [
 *     { name: "example.com", type: "MX", content: "aspmx.l.google.com", priority: 1 },
 *     { name: "example.com", type: "MX", content: "alt1.aspmx.l.google.com", priority: 5 },
 *   ],
 * });
 * ```
 */
export interface DnsRecord<
  ID extends string = string,
  Props extends DnsRecordProps = DnsRecordProps,
> extends Resource<
    "Cloudflare.DNS.Record",
    ID,
    Props,
    DnsRecordAttr<Props>,
    DnsRecord
  > {}

export const DnsRecord = Resource<{
  <const ID extends string, const Props extends DnsRecordProps>(
    id: ID,
    props: Props,
  ): DnsRecord<ID, Props>;
}>("Cloudflare.DNS.Record");
