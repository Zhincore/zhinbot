import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import ms from "ms";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";
import { ModeratorService } from "./ModeratorService";

@DiscordAdapter()
export class ModeratorDiscordAdapter {
  constructor(private readonly service: ModeratorService) {}

  @DiscordCommand({
    description: "Timeout a member for a custom amount of time",
    options: [
      {
        name: "member",
        description: "The member to timeout",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "duration",
        description: "How long the timeout should last (e.g. `1h` or `30s`)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "reason",
        description: "Explanation why was the timeout given",
        type: ApplicationCommandOptionType.String,
      },
      {
        name: "announce",
        description: "Whether or not the timeout should be announced",
        type: ApplicationCommandOptionType.Boolean,
      },
    ],
  })
  async timeout(interaction: ChatInputCommandInteraction<"cached">) {
    const result = await this.service.timeout(
      interaction.guildId,
      interaction.options.getUser("member", true).id,
      ms(interaction.options.getString("duration", true)),
      interaction.options.getString("reason", true),
      interaction.options.getBoolean("announce", false) ? interaction.channelId : undefined,
    );

    return interaction.reply({
      ephemeral: true,
      content: result ? "Successfully timed out a member" : "Member not found",
    });
  }
}
