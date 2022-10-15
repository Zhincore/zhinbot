import { BotModule } from "@core/decorators";
import { ActivitiesDiscordAdapter } from "./Activities.discord";

@BotModule({ name: "activities", discordAdapters: [ActivitiesDiscordAdapter] })
export class ActivitiesModule {}
