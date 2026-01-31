export type cwd = typeof cwd;
export const cwd = { type: "cwd" } as const;

export const isCwd = (x: any): x is cwd => x?.type === "cwd";
