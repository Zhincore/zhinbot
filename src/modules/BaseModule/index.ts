import { BotModule } from "@core/decorators";
import { Bot } from "@core/Bot";
import { PrismaService } from "~/services/PrismaService";
import { BaseModuleDiscordAdapter } from "./BaseModule.discord";

@BotModule({ discordAdapters: [BaseModuleDiscordAdapter] })
export class BaseModule {
  constructor(bot: Bot, private readonly prisma: PrismaService) {
    bot.on("guildCreate", (guild) => {
      this.createGuild(guild.id);
    });

    bot.once("ready", (bot) => {
      bot.guilds.cache.forEach((guild) => this.createGuild(guild.id));
    });
  }

  private async createGuild(id: string) {
    return this.prisma.guild
      .upsert({
        where: { id },
        create: { id },
        update: {},
      })
      .catch(console.error);
  }

  ping() {
    return "Pong";
  }
}
