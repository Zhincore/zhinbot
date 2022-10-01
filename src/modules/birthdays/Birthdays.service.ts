import { EmbedBuilder, GuildMember, Snowflake, TextBasedChannel } from "discord.js";
import * as chrono from "chrono-node";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { PrismaService } from "~/services/Prisma.service";
import { Schedule } from "~/utils/Schedule";
import { Config } from "~/Config";
import { pickRandom } from "~/utils";
import * as messages from "./messages";

const DAY = 24 * 60 * 60 * 1000;
const GUILD_SELECT = {
  bdayAlertChannel: true,
  bdayAlertTime: true,
  bdayAlertPing: true,
} as const;

@Service()
export class BirthdaysService {
  private readonly schedules = new Map<Snowflake, Schedule>();

  constructor(private readonly prisma: PrismaService, private readonly bot: Bot, private readonly config: Config) {
    bot.on("guildDelete", (guild) => this.removeSchedule(guild.id));

    bot.once("ready", () => this.updateSchedules());
  }

  private async updateSchedules() {
    const guilds = await this.prisma.guild.findMany({
      where: { bdayAlertTime: { not: null } },
      select: { bdayAlertTime: true, id: true },
    });

    for (const guild of guilds) {
      this.updateSchedule(guild.id, guild.bdayAlertTime!);
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

    schedule = new Schedule(() => this.announceBirthdays(guildId), start, DAY);
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

    const embeds: EmbedBuilder[] = [];
    const subjects: GuildMember[] = [];
    for (const bday of bdays) {
      const subject = await guild.members.fetch(bday.userId);
      if (!subject) continue;

      subjects.push(subject);
      embeds.push(
        new EmbedBuilder({
          title: "🎂 " + pickRandom(messages.titles).replace("{subject}", subject.toString()),
          description: pickRandom(messages.messages),
        }),
      );
    }

    if (!subjects.length) return;

    const listFormatter = new Intl.ListFormat();
    return channel.send({
      content: (ping ? ping.toString() + " | " : "") + listFormatter.format(subjects.map((s) => s.toString())),
      embeds: embeds,
    });
  }

  async getAlertSettings(guildId: Snowflake) {
    return this.prisma.guild.findUnique({
      where: { id: guildId },
      select: GUILD_SELECT,
    });
  }

  async updateAlertSettings(guildId: Snowflake, settings: { time?: string; channel?: Snowflake; ping?: Snowflake }) {
    if (settings.time) this.updateSchedule(guildId, settings.time);

    return this.prisma.guild.update({
      where: { id: guildId },
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
    return _date;
  }

  stringifyDate(date: Date) {
    return date.toLocaleString("default", {
      month: "long",
      day: "numeric",
    });
  }
}
