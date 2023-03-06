import { BotModule } from "@core/decorators";
import { PollsDiscordAdapter } from "./Polls.discord";

@BotModule({ name: "polls", discordAdapters: [PollsDiscordAdapter] })
export class PollsModule {}
