import { Client, Channel, TextChannel, Snowflake, Message, Emoji, Guild } from "discord.js";
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

  async fetchMessage(channel: TextChannel, messageId: Snowflake): Promise<Message>;
  async fetchMessage(channelId: Snowflake, messageId: Snowflake): Promise<Message>;
  async fetchMessage(channelOrId: Snowflake | TextChannel, messageId: Snowflake) {
    const channel = await (typeof channelOrId === "string" ? this.fetchChannel<TextChannel>(channelOrId) : channelOrId);
    if (!channel?.isText()) throw new Error("Channel not found");
    return channel.messages.fetch(messageId);
  }

  resolveEmoji(str: string | { id: string; name: string }) {
    if (!str) return null;
    if (typeof str === "object") str = str.id || str.name;

    const customEmojiID = (str.match(/^(?:<:.+:)?(\d+)>?$/) || [])[1];
    if (customEmojiID) return this.emojis.resolve(customEmojiID);

    const defaultEmoji = (str.match(emojiRegex()) || [])[0];
    if (defaultEmoji) return { animated: false, name: defaultEmoji } as Emoji;

    return null;
  }

  resolveRole(str: string, guild: Guild) {
    if (!str) return null;
    const roleID = (str.match(/(?:<@&)?(\d+)>?/) || [])[1];
    if (roleID) return guild.roles.resolve(roleID);
    return null;
  }
}

export type BotOptions = {
  owners: string[];
};
