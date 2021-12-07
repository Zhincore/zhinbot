import { BotModule } from "@core/decorators";
import { PlayerDiscordAdapter } from "./PlayerDiscordAdapter";

@BotModule({ discordAdapters: [PlayerDiscordAdapter] })
export class PlayerModule {}
