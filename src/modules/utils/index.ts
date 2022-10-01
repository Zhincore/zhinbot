import { BotModule } from "@core/decorators";
import { UtilsDiscordAdapter } from "./Utils.discord";

@BotModule({ discordAdapters: [UtilsDiscordAdapter] })
export class UtilsModule {}
