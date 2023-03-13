import { BotModule } from "@core/decorators/index.js";
import { AutoroleDiscordAdapter } from "./Autorole.discord.js";
import { SelfRolesDiscordAdapter } from "./SelfRoles.discord.js";
import { SelfRolesConfigDiscordAdapter } from "./SelfRolesConfig.discord.js";

@BotModule({
  name: "selfroles",
  discordAdapters: [AutoroleDiscordAdapter, SelfRolesDiscordAdapter, SelfRolesConfigDiscordAdapter],
})
export class SelfRolesModule {}
