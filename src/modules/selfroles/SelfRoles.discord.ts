import Discord, { ApplicationCommandOptionType, ButtonStyle, MessageActionRowComponentBuilder } from "discord.js";
import Color from "color";
import { Bot } from "@core/Bot";
import { table } from "@core/utils";
import { DiscordAdapter, DiscordAutocompleter, DiscordSubcommand, DiscordHandler } from "@core/decorators";
import { CustomCommandOptionData } from "~/core/decorators/DiscordAdapter/_utils";
import { SelfRolesService } from "./SelfRoles.service";
import { editableFields, editableFieldNameToField } from "./editableFields";

export const ROLE_ASSIGN_ID = "selfroles.assign";
export const DESTROY_BTN_ID = "selfroles.delete";
const ID_ARG: CustomCommandOptionData = {
  name: "item",
  type: ApplicationCommandOptionType.String,
  description: "t:cmd-selfroles--item-dsc",
  required: true,
  autocomplete: "item",
};

@DiscordAdapter({
  supercomand: {
    name: "selfroles",
  },
})
export class SelfRolesDiscordAdapter {
  constructor(private readonly service: SelfRolesService, private readonly bot: Bot) {}

  @DiscordAutocompleter("item")
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
    const result = await this.service.list(interaction.guildId);
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
          Object.entries(result)
            .filter(([field]) => field in editableFields)
            .map(
              ([field, value]) =>
                `${field}: ${value}${
                  field in editableFields ? " # " + editableFields[field as keyof typeof editableFields]!.type : ""
                }`,
            )
            .join("\n") +
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
    options: [{ ...ID_ARG }],
  })
  async render(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    await interaction.deferReply({ ephemeral: true });
    const name = interaction.options.getString("item", true);
    const result = await this.service.render(interaction.guildId, name);

    return interaction.editReply(result ? "Successfully (re)rendered item" : "Failed (re)rendering item");
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
          { name: "emoji", type: ApplicationCommandOptionType.String, required: true },
          { name: "label", type: ApplicationCommandOptionType.String, description: "Additional label for the role" },
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

      const emoji = this.bot.serializeEmoji(interaction.options.getString("emoji", true));
      if (!emoji) throw "The provided emoji is not valid";
      const description = interaction.options.getString("description", false);
      const label = interaction.options.getString("label", false);

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

  @DiscordSubcommand((b) => ({
    type: ApplicationCommandOptionType.SubcommandGroup,
    options: Object.values(editableFields).map((field) => ({
      name: field.name,
      description: b.trans.t(`cmd-selfroles-edit--dsc`, { fieldName: field.name }),
      type: ApplicationCommandOptionType.Subcommand,
      options: [{ ...ID_ARG }, { ...field, name: "value" }],
    })),
  }))
  async edit(interaction: Discord.ChatInputCommandInteraction<"cached">) {
    await interaction.deferReply({ ephemeral: true });
    const fieldName = interaction.options.getSubcommand(true);
    const dbfield = editableFieldNameToField[fieldName];
    const field = editableFields[dbfield];
    if (!field) throw new Error(`Unknown field ${fieldName} (${dbfield})`);
    const name = interaction.options.getString("item", true);
    const value = interaction.options.get("value", field.required)!;

    let _value: any;

    if (fieldName === "color") {
      _value = Color(value.value as string).rgbNumber();
    } else if (value.type === ApplicationCommandOptionType.Channel) {
      _value = value.channel!.id;
    } else {
      _value = value.value;
    }

    const result = await this.service.edit(interaction.guildId, name, dbfield, _value);

    return interaction.editReply(result ? "Successfully edited" : "Editing failed");
  }
}
