import { BotModule } from "@core/decorators";
import { ActivitiesDiscordAdapter } from "./ActivitiesDiscordAdapter";

@BotModule({ discordAdapters: [ActivitiesDiscordAdapter] })
export class ActivitiesModule {}
