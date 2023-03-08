import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import YAML from "yaml";
import { DiscordAdapter, DiscordCommand } from "@core/decorators/index.js";
import { ModeratorService, ModConfig } from "./Moderator.service.js";

@DiscordAdapter()
export class ModeratorConfigDiscordAdapter {
  constructor(private readonly service: ModeratorService) {}

  @DiscordCommand({
    options: [
      {
        name: "set",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "automod",
            type: ApplicationCommandOptionType.Boolean,
          },
        ],
      },
      {
        name: "get",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  })
  async modconf(interaction: ChatInputCommandInteraction<"cached">) {
    const config = await this.service.getGuildConfig(interaction.guildId);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "get") {
      return interaction.reply({
        ephemeral: true,
        content: `Moderator module config:\n\`\`\`yaml\n${YAML.stringify({ automod: config.automod })}\`\`\``,
      });
    }

    const patch: Partial<ModConfig> = {
      automod: interaction.options.getBoolean("automod") ?? undefined,
    };
    Object.assign(config, patch);

    await this.service.setGuildConfig(interaction.guildId, config);

    return interaction.reply({
      ephemeral: true,
      content: "Configuration updated",
    });
  }
}
