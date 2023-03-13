import Discord, { ApplicationCommandOptionType } from "discord.js";
import { CustomCommandOptionData, DiscordAdapter, DiscordSubcommand } from "@core/index.js";
import { SelfRolesService } from "./SelfRoles.service.js";

const APPLY_ARG: CustomCommandOptionData = {
  name: "apply",
  type: ApplicationCommandOptionType.Boolean,
  description: "t:cmd-autorole--apply-dsc",
  required: false,
};

@DiscordAdapter({
  supercomand: {
    name: "autorole",
  },
})
export class AutoroleDiscordAdapter {
  constructor(private readonly service: SelfRolesService) {}

  @DiscordSubcommand({
    options: [{ name: "role", type: ApplicationCommandOptionType.Role, required: true }, APPLY_ARG],
  })
  async set(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const role = interaction.options.getRole("role", true);
    const apply = interaction.options.getBoolean("apply", false);
    await this.service.setAutorole(interaction.guildId, role.id, apply);
    return interaction.reply({ content: "Autorole updated", ephemeral: true });
  }

  @DiscordSubcommand({
    options: [APPLY_ARG],
  })
  async remove(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const apply = interaction.options.getBoolean("apply", false);
    await this.service.setAutorole(interaction.guildId, null, apply);
    return interaction.reply({ content: "Autorole removed", ephemeral: true });
  }

  @DiscordSubcommand({})
  async show(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const roleId = await this.service.getAutorole(interaction.guildId);
    const role = roleId && (await interaction.guild.roles.fetch(roleId));
    return interaction.reply({ content: role ? `Current autorole is ${role}` : "No autorole is set", ephemeral: true });
  }
}
