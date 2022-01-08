import { BotModule } from "@core/decorators";
import { ModeratorDiscordAdapter } from "./ModeratorDiscordAdapter";
import { ModeratorConfigDiscordAdapter } from "./ModeratorConfigDiscordAdapter";
import { ModeratorWarnsDiscordAdapter } from "./ModeratorWarnsDiscordAdapter";
import { AutomodSubModule } from "./Automod";

@BotModule({
  discordAdapters: [ModeratorDiscordAdapter, ModeratorConfigDiscordAdapter, ModeratorWarnsDiscordAdapter],
  subModules: [AutomodSubModule],
})
export class ModeratorModule {}
