import { BotModule } from "@core/decorators";
import { SelfRolesDiscordAdapter } from "./SelfRolesDiscordAdapter";

@BotModule({ discordAdapters: [SelfRolesDiscordAdapter] })
export class SelfRolesModule {}
