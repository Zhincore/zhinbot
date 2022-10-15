import { BotModule } from "@core/decorators";
import { PlayerDiscordAdapter } from "./Player.discord";

@BotModule({ name: "player", discordAdapters: [PlayerDiscordAdapter] })
export class PlayerModule {}
