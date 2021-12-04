import { Client, Channel, TextChannel, Snowflake, Message, Guild, GuildEmoji, DiscordAPIError } from "discord.js";
import { Container, Service } from "typedi";
import emojiRegex from "emoji-regex";
import { ModuleManager } from "./ModuleManager";

@Service()
export class Bot extends Client {
  readonly isDev = process.env.NODE_ENV !== "production";

  readonly container = Container.of();
  readonly modules = new ModuleManager(this);

  readonly readyPromise: Promise<void>;
  /** Has to be set before calling `bot.modules.register` */
  owners: string[] = [];

  constructor() {
    super({
      intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_VOICE_STATES"],
    });

    if (this.isDev) this.on("debug", console.log);
    this.on("warn", console.warn);
    this.on("error", console.error);

    this.once("ready", () => {
      console.log("Logged in as %s", this.user!.tag);
    });

    this.readyPromise = new Promise((resolve) => this.once("ready", () => resolve()));

    this.container.set(Bot, this);
  }

  destroy() {
    console.log("Logging out...");
    super.destroy();
  }

  async login(token?: string) {
    await super.login(token);

    return "";
  }

  // utils

  async fetchChannel<TChannel extends Channel = Channel>(channelId: Snowflake) {
    return this.channels.fetch(channelId) as Promise<TChannel | null>;
  }

  async fetchMessage(channel: TextChannel, messageId?: Snowflake | null): Promise<Message>;
  async fetchMessage(channelId: Snowflake, messageId?: Snowflake | null): Promise<Message>;
  async fetchMessage(channelOrId: Snowflake | TextChannel, messageId?: Snowflake | null) {
    if (!messageId) return;
    const channel = await (typeof channelOrId === "string" ? this.fetchChannel(channelOrId) : channelOrId);
    if (!channel) throw new Error("Channel not found");
    if (!channel.isText()) throw new Error("Channel is not textual");
    return channel.messages.fetch(messageId).catch((err) => {
      if (err instanceof DiscordAPIError && err.message === "Unknown Message") return null;
      throw err;
    });
  }

  serializeEmoji(emoji: string | { identifier: string; id?: string | null }) {
    if (!emoji) return null;

    if (typeof emoji === "object") {
      if (emoji.id) return emoji.id;
      emoji = emoji.identifier;
    }

    emoji = decodeURIComponent(emoji);

    const customEmojiID = (emoji.match(/^(?:<:)?(?:a:)?(?:.+:)?(\d+)(?:>)?$/) || [])[1];
    if (customEmojiID) return customEmojiID;

    const defaultEmoji = (emoji.match(emojiRegex()) || [])[0];
    if (defaultEmoji) return defaultEmoji;

    return null;
  }

  resolveEmoji(identifier: string | GuildEmoji) {
    return this.emojis.resolve(identifier) ?? identifier;
  }

  resolveRole(str: string, guild: Guild) {
    if (!str) return null;
    const roleID = (str.match(/(?:<@&)?(\d+)>?/) || [])[1];
    if (roleID) return guild.roles.resolve(roleID);
    return null;
  }
}
