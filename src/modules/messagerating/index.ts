import { BotModule } from "@core/decorators";
import { MessageRatingDiscordAdapter } from "./MessageRatingDiscordAdapter";

@BotModule({ discordAdapters: [MessageRatingDiscordAdapter] })
export class MessageRatingModule {}
