import { BotModule } from "@core/decorators";
import { SelfRolesDiscordAdapter } from "./SelfRoles.discord";

@BotModule({ discordAdapters: [SelfRolesDiscordAdapter] })
export class SelfRolesModule {}
