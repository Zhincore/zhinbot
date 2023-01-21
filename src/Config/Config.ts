import fs from "node:fs/promises";
import TOML from "@ltd/j-toml";
import Validator from "fastest-validator";
import ms from "ms";
import { Locale, LocaleString } from "discord.js";
import { Service } from "@core/decorators";
import { isErrno } from "../utils";
import { defineValidationSchema, TypeFromValidationSchema } from "./TypeFromValidationSchema";

const SCHEMA = defineValidationSchema({
  color: "number",
  defaultLocale: {
    type: "enum",
    values: Object.values<LocaleString>(Locale),
    optional: true,
  },
  modules: {
    $$type: "object",
    birthdays: {
      $$type: "object",
      images: {
        type: "array",
        items: "string",
      },
    },
    player: {
      $$type: "object",
      maxQueueLength: "number",
      timeout: "ms",
      songCache: {
        $$type: "object",
        ttl: "ms",
        size: "number",
      },
    },
    moderation: {
      $$type: "object",
      warnPenalties: {
        type: "array",
        items: {
          $$type: "object",
          count: "number",
          perTime: "ms",
          duration: "ms",
        },
      },
    },
  },
  system: {
    $$type: "object",
    journalIdentifier: { type: "string", optional: true },
  },
} as const);

type IConfig = TypeFromValidationSchema<typeof SCHEMA>;

@Service()
export class Config implements IConfig {
  color = 0x63a6cb;
  defaultLocale: IConfig["defaultLocale"] = "en-US";

  apiPort: number | null = parseInt(env("API_PORT", "")) || null;

  auth = {
    databaseUrl: env("DATABASE_URL", null) ?? undefined,
    discordToken: env("DISCORD_TOKEN"),
  };

  modules: IConfig["modules"] = {
    birthdays: {
      images: [],
    },
    player: {
      maxQueueLength: 0,
      timeout: 0,
      songCache: {
        ttl: 0,
        size: 0,
      },
    },
    moderation: {
      warnPenalties: [],
    },
  };

  system: IConfig["system"] = {
    journalIdentifier: undefined,
  };

  readonly #check = new Validator({
    useNewCustomCheckerFunction: true,
    aliases: {
      ms: { type: "string", custom: (v: any) => ms(v) },
    },
  }).compile(SCHEMA);

  async load() {
    const defaults = await this.loadFile("./config.default.toml");
    if (defaults) Object.assign(this, defaults);

    const overrides = await this.loadFile("./config.toml");
    if (overrides) Object.assign(this, overrides);

    if (!defaults && !overrides) throw new Error("No valid config file found!");
  }

  private async loadFile(path: string) {
    try {
      const obj = TOML.parse(await fs.readFile(path), undefined, false);

      const errors = await this.#check(obj);
      if (Array.isArray(errors) && errors.length) {
        console.error(`Config file '${path}' contains errors:\n` + errors.map((e) => `\t- ${e.message}`).join("\n"));
        console.error(`Config file '${path}' is not valid and won't be loaded.`);
        console.error();
        return;
      }

      return obj;
    } catch (err) {
      if (isErrno(err) && err.code == "ENOENT") return;
      throw err;
    }
  }
}

function env<T = string>(key: string, fallback?: T) {
  if (key in process.env) return process.env[key] as string;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing environment variable '${key}'`);
}
