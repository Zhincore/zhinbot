import { PrismaClient } from "@prisma/client";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Config } from "~/Config";

@Service()
export class PrismaService extends PrismaClient {
  constructor(config: Config, bot: Bot) {
    super({
      datasources: { db: { url: config.databaseUrl } },
      errorFormat: process.env.NODE_ENV === "production" ? "minimal" : undefined,
    });

    bot.on("guildCreate", (guild) => {
      this.createGuild(guild.id);
    });

    bot.once("ready", (bot) => {
      bot.guilds.cache.forEach((guild) => this.createGuild(guild.id));
    });
  }

  private async createGuild(id: string) {
    return this.guild
      .upsert({
        where: { id },
        create: { id },
        update: {},
      })
      .catch(console.error);
  }
}
