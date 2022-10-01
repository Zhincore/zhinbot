import { BotModule } from "@core/decorators";
import { ActivitiesDiscordAdapter } from "./Activities.discord";

@BotModule({ discordAdapters: [ActivitiesDiscordAdapter] })
export class ActivitiesModule {}
