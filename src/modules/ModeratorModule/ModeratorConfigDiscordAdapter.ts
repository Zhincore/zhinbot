import { CommandInteraction } from "discord.js";
import { DiscordAdapter, DiscordSubcommand } from "@core/decorators";
import { ModeratorService, ControlRole, controlRoles } from "~/services/ModeratorService";

@DiscordAdapter({
  supercomand: { name: "moderator", description: "Settings for moderator module", defaultPermission: false },
})
export class ModeratorConfigDiscordAdapter {
  constructor(private readonly service: ModeratorService) {}

  @DiscordSubcommand({
    description: "Change roles",
    options: [
      {
        name: "type",
        type: "STRING",
        description: "The role type to change",
        choices: controlRoles.map((role) => ({ name: role, value: role })),
        required: true,
      },
      { name: "role", type: "ROLE", description: "The new role for the given type" },
    ],
  })
  async setrole(interaction: CommandInteraction<"present">) {
    const roleName = interaction.options.getString("type", true);
    const role = interaction.options.getRole("role", false);

    if (!controlRoles.includes(roleName)) throw "Unknown role type";

    await this.service.updateRoleId(interaction.guildId, roleName as ControlRole, role?.id);
    return interaction.reply({ content: "Role updated", ephemeral: true });
  }

  @DiscordSubcommand({
    description: "Change the channel where moderation updates are sent",
    options: [
      {
        name: "channel",
        type: "CHANNEL",
        description: "The channel where moderation updates are sent",
      },
    ],
  })
  async updateschannel(interaction: CommandInteraction<"present">) {
    const channel = interaction.options.getChannel("channel", false);
    if (channel && channel.type !== "GUILD_TEXT") throw "Updates channel must be a text channel";

    await this.service.updateModUpdatesChannel(interaction.guildId, channel?.id);
    return interaction.reply({ content: "Mod updates channel updated", ephemeral: true });
  }
}
