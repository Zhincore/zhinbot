import { Prisma, PrismaClient } from "@prisma/client";
import { Service } from "@core/decorators/index.js";
import { Bot } from "@core/Bot/index.js";
import { Config } from "~/Config/index.js";

export { default as Prisma } from "@prisma/client";

const prismaOptions = {
  datasources: { db: { url: undefined as string | undefined } },
  errorFormat: process.env.NODE_ENV === "production" ? "minimal" : "pretty",
  log: process.env.NODE_ENV === "production" ? [] : [{ emit: "event", level: "warn" }],
} satisfies Prisma.PrismaClientOptions;

@Service()
export class PrismaService extends PrismaClient<typeof prismaOptions> {
  constructor(config: Config, bot: Bot) {
    super({
      ...prismaOptions,
      datasources: { db: { url: config.auth.databaseUrl } },
    });

    bot.on("guildCreate", (guild) => this.createGuild(guild.id));

    bot.once("ready", async (bot) => {
      await Promise.all(bot.guilds.cache.map((guild) => this.createGuild(guild.id)));
    });

    const logger = bot.getLogger("PrismaService");

    this.$on("warn", (ev) => logger.warn(ev.message, { ev }));
  }

  private async createGuild(guildId: string) {
    await this.guild.upsert({
      where: { guildId },
      create: { guildId },
      update: {},
    });
  }
}
