import { BotModule } from "@core/decorators";
import { ModeratorDiscordAdapter } from "./ModeratorDiscordAdapter";
import { ModeratorConfigDiscordAdapter } from "./ModeratorConfigDiscordAdapter";

@BotModule({ discordAdapters: [ModeratorDiscordAdapter, ModeratorConfigDiscordAdapter] })
export class ModeratorModule {}
