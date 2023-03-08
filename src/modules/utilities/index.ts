import { BotModule } from "@core/decorators/index.js";
import { UtilitiesDiscordAdapter } from "./Utils.discord.js";

@BotModule({ name: "utilities", discordAdapters: [UtilitiesDiscordAdapter] })
export class UtilitiesModule {}
