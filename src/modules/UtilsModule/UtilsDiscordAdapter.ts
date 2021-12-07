import { CommandInteraction, Message } from "discord.js";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";

@DiscordAdapter()
export class UtilsDiscordAdapter {
  @DiscordCommand({ description: 'Replies with "Pong!"' })
  ping(interaction: CommandInteraction) {
    return interaction.reply("Pong!");
  }

  @DiscordCommand({ description: "Measures the roundtrip latency between Discord and the bot" })
  async latency(interaction: CommandInteraction) {
    const sent = (await interaction.reply({ content: "Pinging...", fetchReply: true })) as Message;
    return interaction.editReply(`Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``);
  }

  @DiscordCommand({ description: "Sends some numbers about the bot" })
  async status(interaction: CommandInteraction) {
    const sent = (await interaction.reply({ content: "Measuring...", fetchReply: true })) as Message;

    const uptime = process.uptime();

    return interaction.editReply(
      [
        `Process uptime: \`${uptime * 1000} ms\``,
        `Connection uptime: \`${interaction.client.uptime} ms\``,
        `Ping: \`${interaction.client.ws.ping} ms\``,
        `Latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``,
      ].join("\n"),
    );
  }
}
