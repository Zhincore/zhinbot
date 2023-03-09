import { EmbedBuilder, Snowflake, TextChannel } from "discord.js";
import levenshtein from "js-levenshtein";
import { Config } from "~/Config/Config.js";
import { Bot, Service } from "~/core/index.js";
import { ModeratorService } from "./Moderator.service.js";

@Service()
export class EventLoggingService {
  constructor(
    private readonly bot: Bot,
    private readonly config: Config,
    private readonly moderator: ModeratorService,
  ) {
    const loggingConfig = this.config.modules.moderation.logging;

    if (loggingConfig.logNickname) this.startNicknameLogging();
    if (loggingConfig.logEdited) this.startEditLogging();
    if (loggingConfig.logDeleted) this.startDeletedLogging();
  }

  private async sendLog(logChannel: TextChannel, embedBuilder: EmbedBuilder) {
    await logChannel.send({
      embeds: [embedBuilder.setColor(this.config.color)],
    });
  }

  private async getLogChannel(guildId?: Snowflake) {
    if (!guildId) return;
    const { logChannel } = await this.moderator.getGuildConfig(guildId);
    return this.bot.fetchChannel<TextChannel>(logChannel);
  }

  private startNicknameLogging() {
    this.bot.on("guildMemberUpdate", async (oldMember, newMember) => {
      if (oldMember.nickname == newMember.nickname) return;
      const logChannel = await this.getLogChannel(newMember.guild.id);
      if (!logChannel) return;
      await this.sendLog(
        logChannel,
        new EmbedBuilder()
          .setTitle("Nickname change")
          .setDescription(`Nickname of ${newMember} has been changed:`)
          .setFields([
            { name: "Previous nickname", value: oldMember.nickname || "*none*", inline: true },
            { name: "New nickname", value: newMember.nickname || "*none*", inline: true },
          ]),
      );
    });
  }

  private startEditLogging() {
    this.bot.on("messageUpdate", async (oldMessage, newMessage) => {
      const logChannel = await this.getLogChannel(newMessage.guild?.id);
      if (!logChannel) return;

      if (oldMessage.partial) oldMessage = await oldMessage.fetch();
      if (newMessage.partial) newMessage = await newMessage.fetch();

      const { editThreshold } = this.config.modules.moderation.logging;
      const maxLen = Math.max(oldMessage.content.length, newMessage.content.length);
      const distance = levenshtein(oldMessage.content, newMessage.content);
      const distancePer = distance / maxLen;

      if (distancePer > editThreshold) {
        await this.sendLog(
          logChannel,
          new EmbedBuilder()
            .setTitle(`A message has been edited`)
            .setDescription(`${newMessage.member} has edited their message in ${newMessage.channel}:`)
            .setFields([
              { name: "Previous content", value: oldMessage.content || "*none*" },
              { name: "New content", value: newMessage.content || "*none*" },
            ])
            .setFooter({
              text: `Levenshtein distance = ${distance} (${(distancePer * 100).toFixed(2)}%) > ${(
                editThreshold * 100
              ).toFixed(2)}%`,
            }),
        );
      }
    });
  }

  private startDeletedLogging() {
    this.bot.on("messageDelete", async (message) => {
      const logChannel = await this.getLogChannel(message.guild?.id);
      if (!logChannel) return;
      if (message.partial) message = await message.fetch();

      const embed = new EmbedBuilder()
        .setTitle(`A message has been deleted`)
        .setDescription(`A message from ${message.member} has been deleted in ${message.channel}:`)
        .setFields({ name: "Content", value: message.content || "*none*" });

      if (message.attachments.size) {
        embed.addFields({ name: "Number of attachments", value: message.attachments.size + "", inline: true });
      }

      await this.sendLog(logChannel, embed);
    });
  }
}
