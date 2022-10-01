import { BotModule } from "@core/decorators";
import { MessageRatingDiscordAdapter } from "./MessageRating.discord";

@BotModule({ discordAdapters: [MessageRatingDiscordAdapter] })
export class MessageRatingModule {}
