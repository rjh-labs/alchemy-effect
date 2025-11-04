import type { Workers } from "cloudflare/resources/workers/beta.mjs";
import { Resource } from "../../resource.ts";

export type AssetsProps = {
  directory: string;
  config?: Workers.Version.Assets.Config;
};

export type AssetsAttr<Props extends AssetsProps> = {
  directory: Props["directory"];
  config: Props["config"] extends Workers.Version.Assets.Config
    ? Props["config"]
    : undefined;
  manifest: Record<string, { hash: string; size: number }>;
  _headers: string;
  _redirects: string;
};

export interface Assets<ID extends string, Props extends AssetsProps>
  extends Resource<"Cloudflare.Assets", ID, Props, AssetsAttr<Props>> {}

export const Assets = Resource<{
  <const ID extends string, const Props extends AssetsProps>(
    id: ID,
    props: Props,
  ): Assets<ID, Props>;
}>("Cloudflare.Assets");
