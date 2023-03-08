import { BotModule } from "@core/decorators/index.js";
import { PlayerDiscordAdapter } from "./Player.discord.js";

@BotModule({ name: "player", discordAdapters: [PlayerDiscordAdapter] })
export class PlayerModule {}
