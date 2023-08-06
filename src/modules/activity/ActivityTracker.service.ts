import { Prisma } from "@prisma/client";
import { Snowflake } from "discord.js";
import { Service } from "typedi";
import { Logger } from "winston";
import { Config } from "~/Config/Config.js";
import { Bot } from "~/core/index.js";
import { PrismaService } from "~/services/Prisma.service.js";

@Service()
export class ActivityTrackerService {
  private readonly config: Config["modules"]["activity"];
  private readonly cache = new Map<Snowflake, Map<number, Set<Snowflake>>>();
  private readonly logger: Logger;
  private saveTimeout: NodeJS.Timer | null = null;

  constructor(
    private readonly bot: Bot,
    config: Config,
    private readonly prisma: PrismaService,
  ) {
    this.config = config.modules.activity;
    this.logger = bot.getLogger("ActivityService");

    bot.on("messageCreate", async (message) => {
      if (!message.guild || message.author.bot) return;
      return this.storeActivity(message.guild.id, message.author.id);
    });

    setInterval(() => {
      this.onVoiceCheck().catch((err) => this.logger.error(err));
    }, this.config.activityPeriod);
  }

  private async onVoiceCheck() {
    // Scan voice channels for activity
    for (const [_channelId, channel] of this.bot.channels.cache) {
      if (!channel?.isVoiceBased()) continue;

      const members = channel.members.filter(
        (member) => !member.user.bot && (this.config.allowOthersDeaf || !member.voice.deaf),
      );
      if (members.size < this.config.minVoiceChatMembers) return; // not very social

      for (const [memberId, member] of members) {
        if ((!this.config.allowMuted && member.voice.mute) || (!this.config.allowDeaf && member.voice.deaf)) continue;

        this.storeActivity(member.guild.id, memberId);
      }
    }
  }

  private storeActivity(guildId: Snowflake, userId: Snowflake) {
    // Ensure guild cache
    let guildCache = this.cache.get(guildId);
    if (!guildCache) {
      guildCache = new Map();
      this.cache.set(guildId, guildCache);
    }

    const timestamp = this.getTimestamp();

    // Ensure cache record
    const users = guildCache.get(timestamp);
    if (!users) {
      guildCache.set(timestamp, new Set([userId]));
    } else {
      users.add(userId);
    }

    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimeout) return;

    const save = async () => {
      const data: Prisma.ActivityCreateManyInput[] = [];

      // Create data
      for (const [guildId, guildCache] of this.cache) {
        for (const [timestampMs, users] of guildCache) {
          const timestamp = new Date(timestampMs);

          data.push(...Array.from(users, (userId) => ({ guildId, userId, timestamp })));
        }
      }

      // Drop cache
      this.cache.clear();

      // Execute transaction
      return this.prisma.activity.createMany({ data, skipDuplicates: true });
    };

    this.saveTimeout = setTimeout(() => {
      save().catch((err) => this.logger.error(err));
      this.saveTimeout = null;
    }, this.config.savePeriod);
  }

  /** Generates a current timestamp of activityPeriod precision */
  getTimestamp() {
    return Math.trunc(Date.now() / this.config.activityPeriod) * this.config.activityPeriod;
  }
}
