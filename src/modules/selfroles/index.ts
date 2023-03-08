import { BotModule } from "@core/decorators/index.js";
import { SelfRolesDiscordAdapter } from "./SelfRoles.discord.js";
import { SelfRolesConfigDiscordAdapter } from "./SelfRolesConfig.discord.js";

@BotModule({ name: "selfroles", discordAdapters: [SelfRolesDiscordAdapter, SelfRolesConfigDiscordAdapter] })
export class SelfRolesModule {}
