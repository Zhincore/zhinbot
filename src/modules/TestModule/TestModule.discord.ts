import { BaseCommandInteraction, Message } from "discord.js";
import { DiscordAdapter, DiscordCommand, Inject } from "@core/decorators";
import { TestModule } from "./";

@DiscordAdapter()
export class TestModuleDiscordAdapter {
  constructor(@Inject(() => TestModule) private readonly service: TestModule) {}

  @DiscordCommand({ description: 'Replies with "Pong!"' })
  ping(interaction: BaseCommandInteraction) {
    interaction.reply(this.service.ping());
  }

  @DiscordCommand({ description: "Measures the roundtrip latency between Discord and the bot" })
  async latency(interaction: BaseCommandInteraction) {
    const sent = (await interaction.reply({ content: "Pinging...", fetchReply: true })) as Message;
    interaction.editReply(`Roundtrip latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``);
  }

  @DiscordCommand({ description: "Sends some numbers about the bot" })
  async status(interaction: BaseCommandInteraction) {
    const sent = (await interaction.reply({ content: "Measuring...", fetchReply: true })) as Message;

    const uptime = process.uptime();

    interaction.editReply(
      [
        `Process uptime: \`${uptime * 1000} ms\``,
        `Connection uptime: \`${interaction.client.uptime} ms\``,
        `Latency: \`${sent.createdTimestamp - interaction.createdTimestamp}ms\``,
      ].join("\n"),
    );
  }
}
