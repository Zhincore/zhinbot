import Discord, { ApplicationCommandOptionType, ButtonStyle, MessageActionRowComponentBuilder } from "discord.js";
import { Bot } from "@core/Bot";
import { table } from "@core/utils";
import { DiscordAdapter, DiscordAutocompleter, DiscordSubcommand, DiscordHandler } from "@core/decorators";
import { CustomCommandOptionData } from "~/core/decorators/DiscordAdapter/_utils";
import { SelfRolesService } from "./SelfRoles.service";

export const ROLE_ASSIGN_ID = "selfroles.assign";
export const DESTROY_BTN_ID = "selfroles.delete";
const ITEM_AUTOCOM = "selfroles.item";

const ID_ARG: CustomCommandOptionData = {
  name: "item",
  type: ApplicationCommandOptionType.String,
  description: "t:cmd-selfroles--item-dsc",
  required: true,
  autocomplete: ITEM_AUTOCOM,
};

@DiscordAdapter({
  supercomand: {
    name: "selfroles",
  },
})
export class SelfRolesConfigDiscordAdapter {
  constructor(private readonly service: SelfRolesService, private readonly bot: Bot) {}

  @DiscordAutocompleter(ITEM_AUTOCOM)
  async ItemAutocomplete(interaction: Discord.AutocompleteInteraction<"cached">) {
    const query = interaction.options.getFocused();
    return interaction.respond(
      await this.service.search(interaction.guildId, query + "").then((arr) =>
        arr.map((v) => ({
          name: v.name,
          value: v.name,
        })),
      ),
    );
  }

  @DiscordSubcommand({})
  async list(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const result = await this.service.getAll(interaction.guildId);
    return interaction.reply({ content: table(result), ephemeral: true });
  }

  @DiscordSubcommand({
    options: [{ ...ID_ARG }],
  })
  async show(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const name = interaction.options.getString("item", true);
    const result = await this.service.get(interaction.guildId, name);
    const guild = await this.bot.guilds.fetch(interaction.guildId);

    return interaction.reply({
      content: result
        ? "```yaml\n" +
          `Name: ${result.name}\n` +
          "\n" +
          "roles:\n" +
          result.roles
            .map((role) =>
              [
                `  - role: ${this.bot.resolveRole(role.roleId, guild)}`,
                `    emoji: ${role.emoji}`,
                `    description: ${role.description}`,
              ].join("\n"),
            )
            .join("\n") +
          "\n```"
        : "Item not found",
      ephemeral: true,
      components: result
        ? [
            new Discord.ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
              new Discord.ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setCustomId(DESTROY_BTN_ID + ":" + name)
                .setLabel("Delete"),
            ),
          ]
        : [],
    });
  }

  @DiscordSubcommand({
    options: [{ ...ID_ARG, name: "name" }],
  })
  async create(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const name = interaction.options.getString("name", true);
    const id = await this.service.create(interaction.guildId, name);
    return interaction.reply({ content: `Created new selfroles item with name \`${id}\`!`, ephemeral: true });
  }

  @DiscordSubcommand({
    options: [{ ...ID_ARG }],
  })
  async delete(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const name = interaction.options.getString("item", true);
    const result = await this.service.destroy(interaction.guildId, name);

    return interaction.reply({
      content: result ? "Successfully destroyed selfroles item" : "Destroying selfroles item failed",
      ephemeral: true,
    });
  }

  @DiscordHandler(DESTROY_BTN_ID)
  async destroyButton(interaction: Discord.ButtonInteraction<"cached">) {
    const name = interaction.customId.split(":")[1];
    if (!name) return;
    const result = await this.service.destroy(interaction.guildId, name);

    if (result) {
      return interaction.update({ content: `Item with name ${name} destroyed!`, components: [] });
    } else {
      return interaction.reply({
        content: "Destroying selfroles item failed",
        ephemeral: true,
      });
    }
  }

  @DiscordSubcommand({
    type: ApplicationCommandOptionType.SubcommandGroup,
    options: [
      {
        name: "set",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          { ...ID_ARG },
          { name: "role", type: ApplicationCommandOptionType.Role, required: true },
          { name: "emoji", type: ApplicationCommandOptionType.String },
          { name: "label", type: ApplicationCommandOptionType.String },
          { name: "description", type: ApplicationCommandOptionType.String },
        ],
      },
      {
        name: "remove",
        type: ApplicationCommandOptionType.Subcommand,
        options: [{ ...ID_ARG }, { name: "role", type: ApplicationCommandOptionType.Role, required: true }],
      },
    ],
  })
  async role(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const cmd = interaction.options.getSubcommand(true);
    const itemName = interaction.options.getString("item", true);
    const role = interaction.options.getRole("role", true);

    if (cmd === "set") {
      await interaction.deferReply({ ephemeral: true });

      const rawEmoji = interaction.options.getString("emoji", false);
      const description = interaction.options.getString("description", false);
      const label = interaction.options.getString("label", false);

      const emoji = rawEmoji ? this.bot.emojis.resolveIdentifier(rawEmoji) : undefined;
      const result = await this.service.setRole(interaction.guildId, itemName, {
        emoji,
        roleId: role.id,
        description,
        label,
      });

      return interaction.editReply(result ? "Role added/changed" : "Failed to add/change role");
    } else if (cmd === "remove") {
      await interaction.deferReply({ ephemeral: true });
      const result = await this.service.removeRole(interaction.guildId, itemName, role.id);
      return interaction.editReply(result ? "Role removed" : "Failed to remove role");
    }

    return interaction.reply({ content: "Unknown subcommand", ephemeral: true });
  }

  @DiscordSubcommand({
    options: [{ ...ID_ARG }, { name: "newname", type: ApplicationCommandOptionType.String, required: true }],
  })
  async rename(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const name = interaction.options.getString("item", true);
    const newname = interaction.options.getString("newname", true);

    await this.service.edit(interaction.guildId, name, "name", newname);

    return interaction.reply("Successfully renamed selfroles item");
  }

  @DiscordSubcommand({
    options: [{ ...ID_ARG }, { name: "allow", type: ApplicationCommandOptionType.Boolean, required: true }],
  })
  async multiselect(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    const name = interaction.options.getString("item", true);
    const allow = interaction.options.getBoolean("allow", true);

    await this.service.edit(interaction.guildId, name, "multiSelect", allow);

    return interaction.reply(`Successfully ${allow ? "allowed" : "disabled"} multi-select`);
  }
}
