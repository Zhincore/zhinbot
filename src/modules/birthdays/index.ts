import { BotModule } from "@core/decorators/index.js";
import { BirthdaysDiscordAdapter } from "./Birthdays.discord.js";
import { BirthdaysConfigDiscordAdapter } from "./BirthdaysConfig.discord.js";

@BotModule({ name: "birthdays", discordAdapters: [BirthdaysDiscordAdapter, BirthdaysConfigDiscordAdapter] })
export class BirthdaysModule {}
