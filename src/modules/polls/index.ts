import { BotModule } from "@core/decorators/index.js";
import { PollsDiscordAdapter } from "./Polls.discord.js";

@BotModule({ name: "polls", discordAdapters: [PollsDiscordAdapter] })
export class PollsModule {}
