import { BotModule } from "@core/decorators";
import { SelfRolesDiscordAdapter } from "./SelfRoles.discord";

@BotModule({ name: "selfroles", discordAdapters: [SelfRolesDiscordAdapter] })
export class SelfRolesModule {}
