import { Service } from "typedi";
import { Snowflake } from "discord.js";
import { PrismaService } from "~/services/Prisma.service.js";
import { Config } from "~/Config/Config.js";

@Service()
export class ActivityService {
  private readonly config: Config["modules"]["activity"];
  constructor(
    private readonly prisma: PrismaService,
    config: Config,
  ) {
    this.config = config.modules.activity;
  }

  async getActivity(guildId: Snowflake, userId: Snowflake, from: Date, to: Date) {
    const result = await this.prisma.activity.aggregate({
      _count: { _all: true },
      where: {
        guildId,
        userId,
        timestamp: {
          gt: from,
          lt: to,
        },
      },
    });
    return result._count._all * this.config.activityPeriod;
  }
}
