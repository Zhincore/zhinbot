import { BotModule } from "@core/decorators";
import { PlayerDiscordAdapter } from "./Player.discord";

@BotModule({ discordAdapters: [PlayerDiscordAdapter] })
export class PlayerModule {}
