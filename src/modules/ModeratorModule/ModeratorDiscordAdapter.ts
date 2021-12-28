import { CommandInteraction } from "discord.js";
import ms from "ms";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";
import { ModeratorService } from "~/services/ModeratorService";

@DiscordAdapter()
export class ModeratorDiscordAdapter {
  constructor(private readonly service: ModeratorService) {}

  @DiscordCommand({
    description: "Temporarily stop a user from chatting",
    defaultPermission: false,
    options: [
      { name: "user", type: "USER", description: "The user to mute", required: true },
      { name: "duration", type: "STRING", description: "How long should the mute last (e.g. `15m` or `24h`)" },
    ],
  })
  async mute(interaction: CommandInteraction<"present">) {
    const user = interaction.options.getUser("user", true);
    const inDuration = interaction.options.getString("duration", false);

    const duration = await this.service.mute(interaction.guildId, user.id, inDuration ? ms(inDuration) : undefined);

    return interaction.reply({
      content: `Muted ${user} ${duration ? "for " + ms(duration, { long: true }) : "indefinitely"}`,
      ephemeral: true,
    });
  }

  @DiscordCommand({
    description: "Allow muted user to chat again",
    defaultPermission: false,
    options: [{ name: "user", type: "USER", description: "The user to unmute", required: true }],
  })
  async unmute(interaction: CommandInteraction<"present">) {
    const user = interaction.options.getUser("user", true);

    const wasMuted = await this.service.unmute(interaction.guildId, user.id);

    return interaction.reply({ content: wasMuted ? `Unmuted ${user}` : `User ${user} wasn't muted`, ephemeral: true });
  }
}
