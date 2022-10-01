import ms from "ms";
import Color from "color";
import { Service } from "@core/decorators";

@Service()
export class Config implements Readonly<Config> {
  serviceName = process.env.SERVICE_NAME;

  databaseUrl = process.env.DATABASE_URL;
  owners = (process.env.OWNERS ?? "").split(/[, ]+/).filter(Boolean);

  color = Color("#63a6cb").rgbNumber();

  auth = {
    discord: {
      token: process.env.DISCORD_TOKEN,
    },
  };

  activities: ActivitiesConfig = {
    activityMap: {
      youtube: "880218394199220334",
    },
  };

  player = {
    maxQueueLength: Number(process.env.PLAYER_QUEUE_LEN ?? 256),
    timeout: ms(process.env.PLAYER_TIMEOUT ?? "15m"),
    songCache: {
      ttl: ms(process.env.PLAYER_CACHE_TTL ?? "48h"),
      size: Number(process.env.PLAYER_CACHE_SIZE ?? 2048),
    },
  };

  moderation: ModerationConfig = {
    warnPenalties: [
      { count: 2, perTime: ms("1h"), duration: ms("30m") },
      { count: 3, perTime: ms("12h"), duration: ms("2h") },
      { count: 6, perTime: ms("24h"), duration: ms("7d") },
    ],

    automod: {},
  };
}

type ActivitiesConfig = {
  activityMap: Record<string, string>;
};

type ModerationConfig = {
  warnPenalties: { count: number; perTime: number; duration: number }[];
  automod: Record<string, never>;
};
