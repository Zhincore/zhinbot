import { BotModule } from "@core/decorators";
import { ModeratorDiscordAdapter } from "./Moderator.discord";
import { ModeratorConfigDiscordAdapter } from "./ModeratorConfig.discord";
import { ModeratorWarnsDiscordAdapter } from "./ModeratorWarns.discord";
import { AutomodSubModule } from "./Automod";

@BotModule({
  discordAdapters: [ModeratorDiscordAdapter, ModeratorConfigDiscordAdapter, ModeratorWarnsDiscordAdapter],
  subModules: [AutomodSubModule],
})
export class ModeratorModule {}
