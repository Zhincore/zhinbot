import { BotModule } from "@core/decorators";
import { BirthdaysDiscordAdapter } from "./Birthdays.discord";
import { BirthdaysConfigDiscordAdapter } from "./BirthdaysConfig.discord";

@BotModule({ name: "birthdays", discordAdapters: [BirthdaysDiscordAdapter, BirthdaysConfigDiscordAdapter] })
export class BirthdaysModule {}
