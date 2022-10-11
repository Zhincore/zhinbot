import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import ms from "ms";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";
import { ModeratorService } from "./Moderator.service";

@DiscordAdapter()
export class ModeratorDiscordAdapter {
  constructor(private readonly service: ModeratorService) {}

  @DiscordCommand({
    options: [
      { name: "member", type: ApplicationCommandOptionType.User, required: true },
      { name: "duration", type: ApplicationCommandOptionType.String, required: true },
      { name: "reason", type: ApplicationCommandOptionType.String },
      { name: "announce", type: ApplicationCommandOptionType.Boolean },
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
