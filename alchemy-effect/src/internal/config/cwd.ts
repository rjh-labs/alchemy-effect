export type cwd = typeof cwd;

/**
 * Placeholder for referencing the current working directory in module-scoped code.
 *
 * Will be replaced lazily with the actual current working directory (as provided by Effect context).
 */
export const cwd = { type: "cwd" } as const;

export const isCwd = (x: any): x is cwd => x?.type === "cwd";
