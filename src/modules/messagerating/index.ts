import { BotModule } from "@core/decorators/index.js";
import { MessageRatingDiscordAdapter } from "./MessageRating.discord.js";

@BotModule({ name: "messageRating", discordAdapters: [MessageRatingDiscordAdapter] })
export class MessageRatingModule {}
