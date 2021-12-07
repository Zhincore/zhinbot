import { Snowflake } from "discord.js";
import Prisma, { PrismaClient } from "@prisma/client";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Config } from "~/Config";

@Service()
export class PrismaService extends PrismaClient {
  readonly guildData = new Map<Snowflake, Prisma.Guild>();
  readonly initPromise = this.initialize().catch(console.error);

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

    this.$use(async (params, next) => {
      const result = await next(params);
      if (params.model === "Guild") {
        // Patch cached guild data
        const guild: Partial<Prisma.Guild> = result;
        if (guild.id) {
          const guildData = this.guildData.get(guild.id);
          Object.assign(guildData, guild);
        }
      }
      return result;
    });
  }

  private async initialize() {
    // Fetch and cache guild data
    const guildData = await this.guild.findMany();
    for (const guild of guildData) {
      this.guildData.set(guild.id, guild);
    }
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
