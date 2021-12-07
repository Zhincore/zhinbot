import { PermissionOverwriteOptions } from "discord.js";
import ms from "ms";
import { Service } from "@core/decorators";
import type { ControlRole } from "~/services/ModeratorService";

@Service()
export class Config implements Readonly<Config> {
  auth = {
    discord: {
      token: process.env.DISCORD_TOKEN,
    },
  };

  databaseUrl = process.env.DATABASE_URL;
  owners = (process.env.OWNERS ?? "").split(/[, ]+/).filter(Boolean);

  player = {
    maxQueueLength: Number(process.env.PLAYER_QUEUE_LEN ?? 256),
    timeout: ms(process.env.PLAYER_TIMEOUT ?? "15m"),
    songCache: {
      ttl: ms(process.env.PLAYER_CACHE_TTL ?? "48h"),
      size: Number(process.env.PLAYER_CACHE_SIZE ?? 2048),
    },
  };

  moderator: ModeratorConfig = {
    minPunishmentDuration: ms("1m"),
    rolePerms: {
      muted: {
        ADD_REACTIONS: false,
        CONNECT: false,
        SEND_MESSAGES: false,
        SPEAK: false,
      },
    },
  };
}

interface ModeratorConfig {
  minPunishmentDuration: number;
  rolePerms: Omit<Record<ControlRole, PermissionOverwriteOptions>, "categ">;
}
