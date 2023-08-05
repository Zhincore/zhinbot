import {
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { DiscordAdapter, DiscordCommand } from "@core/index.js";
import { AIService } from "./AI.service.js";

@DiscordAdapter()
export class AIDiscordAdapter {
  constructor(private readonly service: AIService) {}

  @DiscordCommand({
    options: [
      {
        name: "channel",
        type: ApplicationCommandOptionType.Channel,
        channelType: [ChannelType.GuildText],
      },
      {
        name: "context",
        type: ApplicationCommandOptionType.String,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
  })
  async aiconfig(interaction: ChatInputCommandInteraction<"cached">) {
    const channel = interaction.options.getChannel("channel", false);
    const context = interaction.options.getString("context", false);

    await this.service.setGuildConfig(interaction.guildId, channel?.id, (context ?? undefined) || null);
    return interaction.reply({ ephemeral: true, content: "Config updated." });
  }
}
