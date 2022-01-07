import { BotModule } from "@core/decorators";
import { ModeratorDiscordAdapter } from "./ModeratorDiscordAdapter";
import { ModeratorWarnsDiscordAdapter } from "./ModeratorWarnsDiscordAdapter";
import { AutomodSubModule } from "./Automod";

@BotModule({
  discordAdapters: [ModeratorDiscordAdapter, ModeratorWarnsDiscordAdapter],
  subModules: [AutomodSubModule],
})
export class ModeratorModule {}
