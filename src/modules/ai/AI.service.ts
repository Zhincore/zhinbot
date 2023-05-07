import { Service } from "typedi";
import fetch from "node-fetch";
import { Config } from "~/Config/Config.js";
import { PrismaService } from "~/services/Prisma.service.js";
import {
  ChannelType,
  GuildMember,
  GuildTextBasedChannel,
  Message,
  MessageFlags,
  MessageType,
  Snowflake,
} from "discord.js";
import { Cache } from "~/utils/Cache.js";
import ms from "ms";
import { Bot } from "~/core/index.js";
import { AIConfig } from "@prisma/client";

@Service()
export class AIService {
  private readonly guildConfigs = new Map<Snowflake, AIConfig | null>();
  private readonly conversations = new Cache<Message<true>[]>(ms("2h"));
  private readonly schedules = new Map<Snowflake, NodeJS.Timeout>();
  private readonly config: Config["modules"]["ai"];
  private readonly serverStatus: { lastCheck: number; online: boolean } = { lastCheck: 0, online: false };

  constructor(private readonly bot: Bot, config: Config, private readonly prisma: PrismaService) {
    this.config = config.modules.ai;

    bot.on("messageCreate", async (msg: Message) => {
      if (!msg.guildId || msg.author.bot) return;

      const guildConfig = await this.getGuildConfig(msg.guildId);
      if (!guildConfig || guildConfig.channelId != msg.channelId) return;

      if (!(await this.checkServer())) return;

      await this.getConversation(msg.guildId, msg as Message<true>);
      this.scheduleReply(msg.guildId);
    });
  }

  private async checkServer() {
    if (Date.now() - this.serverStatus.lastCheck < 1000 * 60) return this.serverStatus.online;
    this.serverStatus.lastCheck = Date.now();

    try {
      await fetch(this.config.baseUrl);
      this.serverStatus.online = true;
    } catch (err) {
      this.serverStatus.online = false;
    }
    return this.serverStatus.online;
  }

  private scheduleReply(guildId: Snowflake) {
    if (this.schedules.has(guildId)) return;

    this.schedules.set(
      guildId,
      setTimeout(async () => {
        this.schedules.delete(guildId);
        await this.reply(guildId);
      }, this.config.replyDelay),
    );
  }

  private async getGuildConfig(guildId: Snowflake) {
    let guildConfig = this.guildConfigs.get(guildId);
    if (guildConfig == undefined) {
      guildConfig = await this.prisma.aIConfig.findUnique({ where: { guildId } });
      this.guildConfigs.set(guildId, guildConfig);
    }
    return guildConfig;
  }

  async setGuildConfig(guildId: Snowflake, channelId?: Snowflake | null, context?: string | null) {
    const guildConfig = await this.prisma.aIConfig.upsert({
      where: { guildId },
      update: { channelId, context },
      create: { guildId, channelId, context },
    });
    this.guildConfigs.set(guildId, guildConfig);
  }

  private async fetchHistory(channelId: Snowflake) {
    const channel = await this.bot.fetchChannel(channelId);
    if (!channel || channel.type != ChannelType.GuildText) throw new Error("Channel not found or is not text");

    const messages = await channel.messages.fetch({ limit: this.config.maxHistory });
    const history: Message<true>[] = [];

    for (const message of messages.values()) {
      if (
        message.cleanContent.trim() &&
        [MessageType.Default, MessageType.Reply].includes(message.type) &&
        !message.flags.has(MessageFlags.Ephemeral)
      ) {
        history.push(message);
      }
    }

    history.reverse();
    return history;
  }

  private async getConversation(guildId: Snowflake, append?: Message<true>) {
    let convo = this.conversations.get(guildId);
    if (convo) {
      if (append) convo.push(append);
      return convo;
    }

    const guildConfig = await this.getGuildConfig(guildId);
    if (!guildConfig || !guildConfig.channelId) return;

    return this.conversations.set(guildId, await this.fetchHistory(guildConfig.channelId));
  }

  private getDisplayName(msg: Message<true>) {
    return msg.member?.displayName ?? msg.author.username;
  }

  private async reply(guildId: Snowflake) {
    const convo = await this.getConversation(guildId);
    if (!convo) return;

    const config = await this.getGuildConfig(guildId);
    if (!config) return;

    const member = await this.bot.fetchMember(guildId, this.bot.user!.id);
    const botName = member?.displayName ?? this.bot.user?.username ?? "AI";

    const maxLen = Number(this.config.parameters.truncation_length) - Number(this.config.parameters.max_new_tokens);
    let prompt = this.generatePrompt(config, botName, convo);
    let length = await this.tokenCount(prompt);

    // Shorten the history to fit
    while ((length ?? 0) > maxLen) {
      convo.shift();
      prompt = this.generatePrompt(config, botName, convo);
      length = await this.tokenCount(prompt);
    }

    const participants = new Set<string>();
    for (const msg of convo) {
      participants.add(this.getDisplayName(msg));
    }

    const channel = await this.bot.fetchChannel<GuildTextBasedChannel>(config.channelId);
    if (!channel) return;

    const typingInterval = setInterval(async () => await channel.sendTyping(), 10 * 1000);

    const reply = await this.generate(
      prompt,
      Array.from(participants, (p) => `\n${p}:`),
    );
    clearInterval(typingInterval);
    if (!reply) return;

    await channel.send(reply);
  }

  private generatePrompt(config: AIConfig, botName: string, convo: Message<true>[]) {
    const history = convo.map((msg) => `${this.getDisplayName(msg)}: ${msg.cleanContent}`);

    return (config.context ?? this.config.defaultContext) + "\n\n" + history.join("\n") + "\n" + `${botName}:`;
  }

  private async tokenCount(prompt: string) {
    const result = await fetch(this.config.baseUrl + "/api/v1/token-count", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!result.ok) {
      console.log(result);
      return;
    }

    const data = (await result.json()) as { results: [{ tokens: string }] };
    return Number(data["results"][0]["tokens"]);
  }

  private async generate(prompt: string, stoppingStrings?: string[]) {
    const params = {
      ...this.config.parameters,
      prompt,
      stopping_strings: [...(stoppingStrings ?? []), "\nBOT:", "\nASSISTANT:", "\n/"],
    };

    const result = await fetch(this.config.baseUrl + "/api/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!result.ok) {
      console.log(result);
      return;
    }

    const data = (await result.json()) as { results: [{ text: string }] };
    return data["results"][0]["text"].replace(/\u200b/g, " ").trim();
  }
}
