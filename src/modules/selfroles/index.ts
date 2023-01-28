import { BotModule } from "@core/decorators";
import { SelfRolesDiscordAdapter } from "./SelfRoles.discord";
import { SelfRolesConfigDiscordAdapter } from "./SelfRolesConfig.discord";

@BotModule({ name: "selfroles", discordAdapters: [SelfRolesDiscordAdapter, SelfRolesConfigDiscordAdapter] })
export class SelfRolesModule {}
