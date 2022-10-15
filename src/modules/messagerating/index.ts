import { BotModule } from "@core/decorators";
import { MessageRatingDiscordAdapter } from "./MessageRating.discord";

@BotModule({ name: "messageRating", discordAdapters: [MessageRatingDiscordAdapter] })
export class MessageRatingModule {}
