import { EmbedBuilder, GuildMember, Snowflake, TextBasedChannel } from "discord.js";
import * as chrono from "chrono-node";
import { Service } from "@core/decorators/index.js";
import { Bot } from "@core/Bot/index.js";
import { PrismaService } from "~/services/Prisma.service.js";
import { Schedule } from "~/utils/Schedule.js";
import { Config } from "~/Config/index.js";
import { TranslationService } from "~/core/Translation.service.js";
import { chooseRandom, dateToUTC } from "~/utils/index.js";

const DAY = 24 * 60 * 60 * 1000;
const GUILD_SELECT = {
  bdayAlertChannel: true,
  bdayAlertTime: true,
  bdayAlertPing: true,
} as const;

@Service()
export class BirthdaysService {
  private readonly schedules = new Map<Snowflake, Schedule>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly trans: TranslationService,
    private readonly bot: Bot,
    private readonly config: Config,
  ) {
    bot.on("guildDelete", (guild) => this.removeSchedule(guild.id));

    bot.once("ready", () => this.updateSchedules());
  }

  private async updateSchedules() {
    const guilds = await this.prisma.guild.findMany({
      where: { bdayAlertTime: { not: null } },
      select: { bdayAlertTime: true, guildId: true },
    });

    for (const guild of guilds) {
      this.updateSchedule(guild.guildId, guild.bdayAlertTime!);
    }
  }

  private updateSchedule(guildId: Snowflake, time: string) {
    let schedule = this.schedules.get(guildId);
    if (schedule) schedule.destroy();

    const now = new Date();
    let start = chrono.strict.parseDate(time, now);
    if (!start) throw new Error("Failed to parse schedule time");

    // If the start already happened today, schedule for tomorrow
    if (+start < +now) start = new Date(+start + DAY);

    schedule = new Schedule(() => this.announceBirthdays(guildId).catch(console.error), start, DAY);
  }

  private removeSchedule(guildId: Snowflake) {
    const schedule = this.schedules.get(guildId);
    if (!schedule) return;
    schedule.destroy();
    this.schedules.delete(guildId);
  }

  private async announceBirthdays(guildId: Snowflake) {
    const date = this.normaliseDate(new Date());
    const settings = await this.getAlertSettings(guildId);
    if (!settings || !settings.bdayAlertChannel) return;

    const channel = await this.bot.fetchChannel<TextBasedChannel>(settings.bdayAlertChannel);
    if (!channel) return;

    const guild = await this.bot.guilds.fetch(guildId);
    const ping = settings.bdayAlertPing && (await guild.roles.fetch(settings.bdayAlertPing));
    // TODO: Only select birthdays of the guild
    const bdays = await this.prisma.birthday.findMany({
      where: { date },
    });
    if (!bdays.length) return;

    const subjects: GuildMember[] = [];
    for (const bday of bdays) {
      const subject = await guild.members.fetch(bday.userId);
      if (!subject) continue;

      subjects.push(subject);
    }

    if (!subjects.length) return;

    const listFormatter = new Intl.ListFormat();
    const images = this.config.modules.birthdays.images;
    return channel.send({
      content: ping?.toString() || undefined,
      embeds: [
        new EmbedBuilder({
          color: this.config.color,
          image: images.length ? { url: chooseRandom(this.config.modules.birthdays.images) } : undefined,
          title:
            "🎂 " +
            this.trans.translate(
              "birthdays-alert-title",
              {
                subject_count: subjects.length,
                subjects: listFormatter.format(subjects.map((s) => s.nickname || s.user.username)),
              },
              guild.preferredLocale,
            ),
          description: this.trans.translate(
            "birthdays-alert-message",
            {
              subject_count: subjects.length,
              subjects: listFormatter.format(subjects.map((s) => s.toString())),
            },
            guild.preferredLocale,
          ),
        }),
      ],
    });
  }

  async getAlertSettings(guildId: Snowflake) {
    return this.prisma.guild.findUnique({
      where: { guildId },
      select: GUILD_SELECT,
    });
  }

  async updateAlertSettings(guildId: Snowflake, settings: { time?: string; channel?: Snowflake; ping?: Snowflake }) {
    if (settings.time) this.updateSchedule(guildId, settings.time);

    return this.prisma.guild.update({
      where: { guildId },
      data: {
        bdayAlertChannel: settings.channel,
        bdayAlertTime: settings.time,
        bdayAlertPing: settings.ping,
      },
      select: GUILD_SELECT,
    });
  }

  set(userId: Snowflake, date: Date) {
    const normDate = this.normaliseDate(date);

    return this.prisma.birthday.upsert({
      where: { userId },
      create: { date: normDate, userId },
      update: { date: normDate },
    });
  }

  get(userId: Snowflake) {
    return this.prisma.birthday.findUnique({
      where: { userId },
    });
  }

  forget(userId: Snowflake) {
    return this.prisma.birthday.deleteMany({
      where: { userId },
    });
  }

  normaliseDate(date: Date) {
    const _date = new Date(0);
    _date.setMonth(date.getMonth());
    _date.setDate(date.getDate());
    return dateToUTC(_date);
  }

  stringifyDate(date: Date) {
    return date.toLocaleString("default", {
      month: "long",
      day: "numeric",
    });
  }
}
