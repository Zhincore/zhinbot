import { PrismaClient } from "@prisma/client";
import { Service } from "@core/decorators";
import { Config } from "~/Config";

@Service()
export class PrismaService extends PrismaClient {
  constructor(config: Config) {
    super({
      datasources: { db: { url: config.databaseUrl } },
      errorFormat: process.env.NODE_ENV === "production" ? "minimal" : undefined,
    });
  }
}
