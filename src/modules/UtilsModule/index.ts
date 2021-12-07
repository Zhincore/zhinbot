import { BotModule } from "@core/decorators";
import { UtilsDiscordAdapter } from "./UtilsDiscordAdapter";

@BotModule({ discordAdapters: [UtilsDiscordAdapter] })
export class UtilsModule {}
