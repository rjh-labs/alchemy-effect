import { env } from "./Env.ts";

export type USER = typeof USER;
export const USER = env.USER ?? env.USERNAME ?? "unknown";
