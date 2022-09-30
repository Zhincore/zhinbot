import Discord, {
  Snowflake,
  TextChannel,
  DMChannel,
  Guild,
  ChannelType,
  MessageCreateOptions,
  EmbedBuilder,
} from "discord.js";
import ms from "ms";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Config } from "~/Config";
import { Cache } from "~/utils/Cache";
import { PrismaService, Prisma } from "~/services/PrismaService";

const TIMEOUT_ERR = "Unable to timeout this member, their rank is probbably higher than mine.";

export type ModConfig = Prisma.ModConfig;

@Service()
export class ModeratorService {
  // private readonly logger = this.bot.getLogger("Moderator");
  private readonly guildConfigs = new Cache<Prisma.ModConfig>(ms("30m"));

  constructor(private readonly bot: Bot, private readonly prisma: PrismaService, private readonly config: Config) {}

  private async announce(message: MessageCreateOptions, userId: Snowflake, channelId: Snowflake, guild: Guild) {
    const send = (channel: TextChannel | DMChannel | null): any => {
      return channel?.send(
        channel.type === ChannelType.DM
          ? {
              ...message,
              content:
                `You have recieved a penalty notification in the "${guild.name}" guild.\n` +
                "If you believe that this is a mistake, please, contact one of the staff members.",
            }
          : message,
      );
    };
    return Promise.all([
      this.bot.fetchChannel<TextChannel>(channelId).then(send),
      this.bot.users.fetch(userId).then((user) => user?.createDM().then(send)),
    ]);
  }

  async getGuildConfig(guildId: Snowflake) {
    let config = this.guildConfigs.get(guildId);
    if (!config) {
      config = await this.prisma.modConfig.upsert({ where: { guildId }, create: { guildId }, update: {} });
      this.guildConfigs.set(guildId, config);
    }
    return config;
  }

  async setGuildConfig(guildId: Snowflake, config: Omit<ModConfig, "guild">) {
    const data = {
      ...config,
      guildId: undefined,
      automodDisabledFilters: config.automodDisabledFilters ?? undefined,
    };

    return this.guildConfigs.set(
      guildId,
      await this.prisma.modConfig.upsert({
        where: { guildId },
        create: { ...data, guild: { connect: { id: guildId } } },
        update: data,
      }),
    );
  }

  // NOTE: This could be in a separate thread?
  private async checkWarnPenalty(guildId: Snowflake, userId: Snowflake, channelId?: Snowflake) {
    const { warnPenalties } = this.config.moderation;
    const time = Date.now();
    const warns = await this.prisma.warning.findMany({ where: { guildId, userId }, select: { timestamp: true } });

    // If member has less warns than minimal penalty, return
    if (warns.length < warnPenalties[0].count) return;

    let penalty: typeof warnPenalties[number] | undefined;
    let count = 0;
    for (const _penalty of warnPenalties.reverse()) {
      count = 0;
      for (const warn of warns) {
        if (time - warn.timestamp.valueOf() <= _penalty.perTime) count++;
      }
      if (count >= _penalty.count) {
        penalty = _penalty;
        break;
      }
    }

    if (penalty) {
      await this.timeout(
        guildId,
        userId,
        penalty.duration,
        `Recieved ${count}/${penalty.count} warnings per ${ms(penalty.perTime)}`,
        channelId,
      ).catch((err) => {
        if (err !== TIMEOUT_ERR) throw err;
      });
    }
  }

  async timeout(guildId: Snowflake, userId: Snowflake, duration: number, reason?: string, channelId?: Snowflake) {
    const member = await this.bot.fetchMember(guildId, userId);
    if (!member) return null;

    try {
      await member.timeout(duration, reason);
    } catch (err) {
      if (err instanceof Discord.DiscordAPIError && err.message == "Missing Permissions") {
        throw TIMEOUT_ERR;
      }
      throw err;
    }

    if (channelId) {
      const embed = new EmbedBuilder({
        title: `🚫 Timed out @${member.user.tag} for ${ms(duration)}`,
        fields: [
          ...(reason ? [{ name: "Reason", value: reason, inline: true }] : []),
          { name: "Member", value: `<@${userId}>`, inline: true },
        ],
        color: 0xf04020,
      });
      await this.announce({ embeds: [embed] }, userId, channelId, member.guild);
    }
    return true;
  }

  async warn({ guildId, userId, reason, staffId }: WarningData, channelId: Snowflake) {
    const memberPromise = this.bot.fetchMember(guildId, userId);
    const memberLink = { guildId, id: userId };
    const { id } = await this.prisma.warning.create({
      data: {
        guild: { connect: { id: guildId } },
        member: { connectOrCreate: { where: { guildId_id: memberLink }, create: memberLink } },
        reason,
        staffId,
      },
    });

    const member = await memberPromise;
    if (!member) return null;
    const embed = new EmbedBuilder({
      title: `⚠️ Warning for @${member.user.tag}`,
      fields: [
        { name: "Reason", value: reason, inline: true },
        { name: "Member", value: `<@${userId}>`, inline: true },
      ],
      color: 0xf0a000,
    });

    await this.announce({ embeds: [embed] }, userId, channelId, member.guild);
    await this.checkWarnPenalty(guildId, userId, channelId);

    return id;
  }

  async listWarns(guildId: Snowflake, userId: Snowflake, skip = 0, take = 25) {
    return this.prisma.$transaction([
      this.prisma.warning.count({ where: { guildId, userId } }),
      this.prisma.warning.findMany({ where: { guildId, userId }, skip, take }),
    ]);
  }

  async deleteWarn(guildId: Snowflake, id: number) {
    return this.prisma.warning.delete({ where: { guildId_id: { guildId, id } } });
  }

  async getWarn(guildId: Snowflake, id: number) {
    return this.prisma.warning.findUnique({ where: { guildId_id: { guildId, id } } });
  }
}

export type ModeratorResolution = any;

export type WarningData = {
  guildId: Snowflake;
  userId: Snowflake;
  staffId: Snowflake;
  reason: string;
};
