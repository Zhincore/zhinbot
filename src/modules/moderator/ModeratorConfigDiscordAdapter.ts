import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import YAML from "yaml";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";
import { ModeratorService, ModConfig } from "./ModeratorService";

@DiscordAdapter()
export class ModeratorConfigDiscordAdapter {
  constructor(private readonly service: ModeratorService) {}

  @DiscordCommand({
    description: "Change or show configuration of the moderator module",
    options: [
      {
        name: "set",
        description: "Change configuration",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "automod",
            description: "Enable/Disable automod",
            type: ApplicationCommandOptionType.Boolean,
          },
        ],
      },
      {
        name: "get",
        description: "Show configuration",
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
