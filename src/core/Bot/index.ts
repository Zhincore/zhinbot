import Discord, { Snowflake, DiscordAPIError } from "discord.js";
import { Container, Service } from "typedi";
import emojiRegex from "emoji-regex";
import { TranslationService } from "../Translation.service";
import { getLogger } from "./getLogger";
import { ModuleManager } from "./ModuleManager";

type BotSettings = {
  owners: string[];
  serviceName?: string;
};

@Service()
export class Bot extends Discord.Client {
  private readonly logger = getLogger();

  readonly container = Container.of();
  readonly modules = new ModuleManager(this);

  readonly readyPromise: Promise<void>;

  constructor(readonly settings: BotSettings) {
    super({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildMessageReactions,
        Discord.GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.on("debug", (m) => {
      this.logger.debug(m);
    });
    this.on("warn", (m) => {
      this.logger.warn(m);
    });
    this.on("error", (m) => {
      this.logger.error(m);
    });

    this.once("ready", async (bot) => {
      this.logger.info("Logged in as %s", bot.user.tag);

      const app = await bot.application.fetch();
      if (app.owner) this.settings.owners.push(app.owner.id);
      try {
        await Promise.all([
          // Update avatar
          app.icon !== bot.user.avatar && bot.user.setAvatar(app.icon).then(() => this.logger.info("Avatar updated")),
          // Update username
          app.name &&
            app.name !== bot.user.username &&
            bot.user.setUsername(app.name).then(() => this.logger.info(`Username updated to '${app.name}'`)),
        ]);
      } catch (err) {
        this.logger.warn(err);
      }
    });

    this.readyPromise = new Promise((resolve) => this.once("ready", () => resolve()));

    this.container.set(Bot, this);
  }

  getLogger(module: string) {
    return this.logger.child({ module });
  }

  destroy() {
    this.logger.info("Logging out...");
    super.destroy();
  }

  async loadTranslations() {
    const trans = this.container.get(TranslationService);
    await trans.load();
  }

  async login(token?: string) {
    await super.login(token);
    return "";
  }

  // utils

  isAdmin(memberOrRole: Discord.GuildMember | Discord.Role) {
    return memberOrRole.permissions.has(Discord.PermissionFlagsBits.Administrator);
  }

  async fetchMember(guildId: Snowflake, userId: Snowflake) {
    return this.guilds.resolve(guildId)?.members.fetch(userId);
  }

  async fetchChannel<TChannel extends Discord.Channel = Discord.Channel>(channelId?: Snowflake | null) {
    return channelId ? (this.channels.fetch(channelId) as Promise<TChannel | null>) : null;
  }

  async fetchMessage(channel?: Discord.TextChannel, messageId?: Snowflake | null): Promise<Discord.Message | null>;
  async fetchMessage(channelId?: Snowflake | null, messageId?: Snowflake | null): Promise<Discord.Message | null>;
  async fetchMessage(channelOrId?: Snowflake | Discord.TextChannel | null, messageId?: Snowflake | null) {
    if (!messageId) return null;
    const channel = await (typeof channelOrId === "string" ? this.fetchChannel(channelOrId) : channelOrId);
    if (!channel) throw new Error("Discord.Channel not found");
    if (channel.type !== Discord.ChannelType.GuildText) throw new Error("Discord.Channel is not textual");
    return channel.messages.fetch(messageId).catch((err) => {
      if (err instanceof DiscordAPIError && err.message === "Unknown Discord.Message") return null;
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

  resolveEmoji(identifier: string | Discord.GuildEmoji) {
    return this.emojis.resolve(identifier) ?? identifier;
  }

  resolveRole(str: string, guild: Discord.Guild) {
    if (!str) return null;
    const roleID = (str.match(/(?:<@&)?(\d+)>?/) || [])[1];
    if (roleID) return guild.roles.resolve(roleID);
    return null;
  }
}
