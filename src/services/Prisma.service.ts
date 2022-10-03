import { PrismaClient } from "@prisma/client";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Config } from "~/Config";

export { default as Prisma } from "@prisma/client";

@Service()
export class PrismaService extends PrismaClient {
  constructor(config: Config, bot: Bot) {
    super({
      datasources: { db: { url: config.auth.databaseUrl } },
      errorFormat: process.env.NODE_ENV === "production" ? "minimal" : undefined,
    });

    bot.on("guildCreate", (guild) => this.createGuild(guild.id));

    bot.once("ready", async (bot) => {
      await Promise.all(bot.guilds.cache.map((guild) => this.createGuild(guild.id)));
    });
  }

  private async createGuild(id: string) {
    await this.guild.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  }
}
