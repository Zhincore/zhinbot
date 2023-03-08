import { BotModule } from "@core/decorators/index.js";
import { ModeratorDiscordAdapter } from "./Moderator.discord.js";
import { ModeratorConfigDiscordAdapter } from "./ModeratorConfig.discord.js";
import { ModeratorWarnsDiscordAdapter } from "./ModeratorWarns.discord.js";
import { AutomodSubModule } from "./Automod/index.js";

@BotModule({
  name: "moderator",
  discordAdapters: [ModeratorDiscordAdapter, ModeratorConfigDiscordAdapter, ModeratorWarnsDiscordAdapter],
  subModules: [AutomodSubModule],
})
export class ModeratorModule {}
