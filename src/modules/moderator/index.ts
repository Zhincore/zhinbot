import { BotModule } from "@core/decorators";
import { AutomodService } from "./Automod/AutomodService";
import { ModeratorDiscordAdapter } from "./ModeratorDiscordAdapter";
import { ModeratorWarnsDiscordAdapter } from "./ModeratorWarnsDiscordAdapter";

@BotModule({ discordAdapters: [ModeratorDiscordAdapter, ModeratorWarnsDiscordAdapter] })
export class AutoModModule {
  constructor(readonly _automod: AutomodService) {}
}
