import { BotModule } from "@core/decorators/index.js";
import { AIDiscordAdapter } from "./AI.discord.js";

@BotModule({ name: "ai", discordAdapters: [AIDiscordAdapter] })
export class AIModule {}
