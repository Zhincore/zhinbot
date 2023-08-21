import { GuildTextBasedChannel, Snowflake } from "discord.js";
import { Service } from "typedi";
import { PrismaService } from "~/services/Prisma.service.js";
import { Scheduler } from "~/utils/Scheduler.js";
import { PollsService } from "./Polls.service.js";
import { Bot } from "~/core/index.js";

@Service()
export class QOTDService {
  private readonly scheduler = new Scheduler((guildId) => this.sendQOTD(guildId));

  constructor(
    private readonly prisma: PrismaService,
    private readonly polls: PollsService,
    private readonly bot: Bot,
  ) {
    bot.on("guildDelete", (guild) => this.deleteSettings(guild.id));
    bot.once("ready", () => this.updateSchedules());
  }

  private async updateSchedules() {
    const guilds = await this.prisma.qotd.findMany({
      where: { time: { not: null }, message: { not: null } },
    });

    for (const guild of guilds) {
      this.scheduler.updateSchedule(guild.guildId, guild.time!);
    }
  }

  private async sendQOTD(guildId: Snowflake) {
    const settings = await this.prisma.qotd.findUnique({
      where: { guildId },
      include: { questions: { include: { answers: true } } },
    });
    if (!settings?.questions.length) return;

    const channel = await this.bot.fetchChannel<GuildTextBasedChannel>(settings.channelId);
    if (!channel) return;

    const question = settings.questions[Math.trunc(settings.questions.length * Math.random())];

    return this.polls.sendPoll(
      channel,
      question.question,
      question.answers.map((v) => v.text),
      settings.message ?? undefined,
    );
  }

  public async getQuestions(guildId: Snowflake) {
    return this.prisma.question.findMany({ where: { guildId } });
  }

  public async addQuestion(guildId: Snowflake, question: string, answers: string[]) {
    return this.prisma.question.create({
      data: {
        guildId: guildId,
        question: question,
        answers: { createMany: { data: answers.map((text) => ({ text })) } },
      },
    });
  }

  public async updateSettings(guildId: Snowflake, channelId: string, time?: string, message?: string) {
    if (time) this.scheduler.updateSchedule(guildId, time);

    await this.prisma.qotd.upsert({
      where: { guildId },
      create: { channelId, time, message, guildId },
      update: { channelId, time, message },
    });
  }

  public getSettings(guildId: Snowflake) {
    return this.prisma.qotd.findUnique({ where: { guildId } });
  }

  public async deleteSettings(guildId: Snowflake) {
    this.scheduler.removeSchedule(guildId);
    this.prisma.qotd.delete({ where: { guildId } });
  }
}
