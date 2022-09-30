import { Snowflake } from "discord.js";
import { Service } from "@core/decorators";
import { PrismaService } from "~/services/PrismaService";

@Service()
export class MessageRatingService {
  constructor(private readonly prisma: PrismaService) {}

  async rate(guildId: Snowflake, userId: Snowflake, rating: number) {
    return this.prisma.messageRating
      .upsert({
        where: { guildId_userId: { guildId, userId } },
        update: { rating: { increment: rating } },
        create: { guildId, userId, rating },
        select: { rating: true },
      })
      .then(({ rating }) => rating);
  }

  async getRating(guildId: Snowflake, userId: Snowflake) {
    return this.prisma.messageRating
      .findUnique({
        where: { guildId_userId: { guildId, userId } },
        select: { rating: true },
      })
      .then((result) => result?.rating ?? 0);
  }
}
