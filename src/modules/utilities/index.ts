import { BotModule } from "@core/decorators";
import { UtilitiesDiscordAdapter } from "./Utils.discord";

@BotModule({ name: "utilities", discordAdapters: [UtilitiesDiscordAdapter] })
export class UtilitiesModule {}
