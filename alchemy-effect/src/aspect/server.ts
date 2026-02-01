import { deriveGraph } from "./graph.ts";
import type { Organization } from "./organization.ts";

export const createServer = <Org extends Organization>(organization: Org) => {
  const _graph = deriveGraph(organization);
};

// type-only cluent to the server
export const createClient = <Org extends Organization>(options?: {
  host?: string;
}) => {};
