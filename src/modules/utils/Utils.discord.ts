import { ChatInputCommandInteraction, Message, PermissionFlagsBits } from "discord.js";
import ms from "ms";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";

@DiscordAdapter()
export class UtilsDiscordAdapter {
  @DiscordCommand({
    description: 'Replies with "Pong!"',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  })
  ping(interaction: ChatInputCommandInteraction) {
    return interaction.reply("Pong!");
  }

  @DiscordCommand({
    description: "Measures the roundtrip latency between Discord and the bot",
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  })
  async latency(interaction: ChatInputCommandInteraction) {
    const sent = (await interaction.reply({ content: "Pinging...", fetchReply: true })) as Message;
    return interaction.editReply(`Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``);
  }

  @DiscordCommand({
    description: "Sends some numbers about the bot",
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  })
  async status(interaction: ChatInputCommandInteraction) {
    const sent = (await interaction.reply({ content: "Measuring...", fetchReply: true })) as Message;

    const uptime = process.uptime();

    return interaction.editReply(
      [
        `Process uptime: \`${ms(uptime * 1000)}\``,
        `Connection uptime: \`${ms(interaction.client.uptime!)}\``,
        `Ping: \`${interaction.client.ws.ping}ms\``,
        `Latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``,
      ].join("\n"),
    );
  }
}
