import ms from "ms";
import { Service } from "@core/decorators";

@Service()
export class Config implements Readonly<Config> {
  auth: AuthConfig = {
    discord: {
      token: process.env.DISCORD_TOKEN,
    },
  };

  databaseUrl = process.env.DATABASE_URL;
  owners = (process.env.OWNERS ?? "").split(/[, ]+/).filter(Boolean);

  player: PlayerConfig = {
    maxQueueLength: Number(process.env.PLAYER_QUEUE_LEN ?? 256),
    timeout: ms(process.env.PLAYER_TIMEOUT ?? "15m"),
    songCache: {
      ttl: ms(process.env.PLAYER_CACHE_TTL ?? "48h"),
      size: Number(process.env.PLAYER_CACHE_SIZE ?? 2048),
    },
  };
}

interface AuthConfig {
  discord: {
    token?: string;
  };
}

interface PlayerConfig {
  maxQueueLength: number;
  timeout: number;
  songCache: {
    ttl: number;
    size: number;
  };
}
