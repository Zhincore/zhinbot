import { ChatInputCommandInteraction, Message, PermissionFlagsBits } from "discord.js";
import ms from "ms";
import { DiscordAdapter, DiscordCommand } from "@core/decorators/index.js";

@DiscordAdapter()
export class UtilitiesDiscordAdapter {
  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  })
  ping(interaction: ChatInputCommandInteraction) {
    return interaction.reply("Pong!");
  }

  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  })
  async latency(interaction: ChatInputCommandInteraction) {
    const sent = (await interaction.reply({ content: "Pinging...", fetchReply: true })) as Message;
    return interaction.editReply(`Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``);
  }

  @DiscordCommand({
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
