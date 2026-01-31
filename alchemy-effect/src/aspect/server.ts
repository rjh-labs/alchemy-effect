import { deriveGraph } from "./graph.ts";
import type { Organization } from "./organization.ts";

export const createServer = <Org extends Organization>(organization: Org) => {
  const graph = deriveGraph(organization);
};

export const createClient = <Org extends Organization>(organization: Org) => {
  const graph = deriveGraph(organization);
};
