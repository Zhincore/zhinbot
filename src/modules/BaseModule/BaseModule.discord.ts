import { BaseCommandInteraction, Message } from "discord.js";
import { DiscordAdapter, DiscordCommand, Inject } from "@core/decorators";
import { BaseModule } from "./";

@DiscordAdapter()
export class BaseModuleDiscordAdapter {
  constructor(@Inject(() => BaseModule) private readonly service: BaseModule) {}

  @DiscordCommand({ description: 'Replies with "Pong!"' })
  ping(interaction: BaseCommandInteraction) {
    return interaction.reply(this.service.ping());
  }

  @DiscordCommand({ description: "Measures the roundtrip latency between Discord and the bot" })
  async latency(interaction: BaseCommandInteraction) {
    const sent = (await interaction.reply({ content: "Pinging...", fetchReply: true })) as Message;
    return interaction.editReply(`Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``);
  }

  @DiscordCommand({ description: "Sends some numbers about the bot" })
  async status(interaction: BaseCommandInteraction) {
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
