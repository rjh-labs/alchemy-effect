import { Resource } from "../../resource.ts";

export type R2BucketProps = {
  name?: string;
  storageClass?: R2Bucket.StorageClass;
  jurisdiction?: R2Bucket.Jurisdiction;
  locationHint?: R2Bucket.Location;
};

export type R2BucketAttr<Props extends R2BucketProps> = {
  name: Props["name"] extends string ? Props["name"] : string;
  storageClass: Props["storageClass"] extends R2Bucket.StorageClass
    ? Props["storageClass"]
    : "Standard";
  jurisdiction: Props["jurisdiction"] extends R2Bucket.Jurisdiction
    ? Props["jurisdiction"]
    : "default";
  location: R2Bucket.Location | undefined;
  accountId: string;
};

export interface R2Bucket<ID extends string, Props extends R2BucketProps>
  extends Resource<"Cloudflare.R2Bucket", ID, Props, R2BucketAttr<Props>> {}

export const R2Bucket = Resource<{
  <const ID extends string, const Props extends R2BucketProps>(
    id: ID,
    props: Props,
  ): R2Bucket<ID, Props>;
}>("Cloudflare.R2Bucket");

export declare namespace R2Bucket {
  export type StorageClass = "Standard" | "InfrequentAccess";
  export type Jurisdiction = "default" | "eu" | "fedramp";
  export type Location = "apac" | "eeur" | "enam" | "weur" | "wnam" | "oc";
}
