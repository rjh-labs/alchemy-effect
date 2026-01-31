import * as S from "effect/Schema";
import { defineAspect } from "../aspect.ts";

export type ChannelId = string;
export const ChannelId = S.String.annotations({
  description: "The ID of the channel",
});

export const Channel = defineAspect("channel");

export const channelContext = Channel.plugin.context.succeed({
  context: (channel) => `#${channel.id}`,
});
