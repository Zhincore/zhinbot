import { Service } from "@core/decorators";

@Service()
export class Config {
  auth: AuthConfig = {
    discord: {
      token: process.env.DISCORD_TOKEN,
    },
  };
  databaseUrl = process.env.DATABASE_URL;
  owners = (process.env.OWNERS ?? "").split(/[, ]+/).filter(Boolean);
}

interface AuthConfig {
  discord: {
    token?: string;
  };
}
