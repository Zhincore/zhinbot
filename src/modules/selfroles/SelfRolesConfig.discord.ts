import Discord, { ApplicationCommandOptionType } from "discord.js";
import { Bot, table, type TranslateFn } from "@core/index.js";
import { DiscordAdapter, DiscordAutocompleter, DiscordSubcommand } from "@core/decorators/index.js";
import { CustomCommandOptionData } from "~/core/decorators/DiscordAdapter/_utils";
import { SelfRolesService } from "./SelfRoles.service.js";

const CATEGORY_AUTOCOM = "selfroles.category";

const ID_ARG: CustomCommandOptionData = {
  name: "category",
  type: ApplicationCommandOptionType.String,
  description: "t:cmd-selfroles--category-dsc",
  required: true,
  autocomplete: CATEGORY_AUTOCOM,
};

@DiscordAdapter({
  supercomand: {
    name: "selfroles",
  },
})
export class SelfRolesConfigDiscordAdapter {
  constructor(private readonly service: SelfRolesService, private readonly bot: Bot) {}

  @DiscordAutocompleter(CATEGORY_AUTOCOM)
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
  async show(interaction: Discord.ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const name = interaction.options.getString("item", true);
    const result = await this.service.get(interaction.guildId, name);
    const guild = await this.bot.guilds.fetch(interaction.guildId);

    if (!result) return interaction.reply({ ephemeral: true, content: t("selfroles-category-notfound", { name }) });

    return interaction.reply({
      ephemeral: true,
      content:
        "```yaml\n" +
        `${t("name")}: ${result.name}\n` +
        `${t("emoji")}: ${result.emoji}\n` +
        `${t("multiselect")}: ${result.multiSelect ? t("allowed") : t("disabled")}\n` +
        "\n" +
        `${t("roles")}:\n` +
        result.roles
          .map((role) =>
            [
              `  - ${t("roles")}: ${this.bot.resolveRole(role.roleId, guild)}`,
              `    ${t("emoji")}: ${role.emoji}`,
              `    ${t("description")}: ${role.description}`,
            ].join("\n"),
          )
          .join("\n") +
        "\n```",
    });
  }

  @DiscordSubcommand({
    options: [
      { ...ID_ARG, name: "name", autocomplete: false },
      { name: "emoji", type: ApplicationCommandOptionType.String },
      { name: "multiselect", type: ApplicationCommandOptionType.Boolean },
    ],
  })
  async create(interaction: Discord.ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const name = interaction.options.getString("name", true);
    const rawEmoji = interaction.options.getString("emoji", false);
    const multiselect = interaction.options.getBoolean("multiselect", false) ?? undefined;

    const emoji = rawEmoji ? this.bot.emojis.resolveIdentifier(rawEmoji) : undefined;
    const id = await this.service.create(interaction.guildId, name, emoji, multiselect);
    return interaction.reply({ content: t("selfroles-created-category", { name: id }), ephemeral: true });
  }

  @DiscordSubcommand({
    options: [{ ...ID_ARG }],
  })
  async delete(interaction: Discord.ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const name = interaction.options.getString("item", true);
    const result = await this.service.delete(interaction.guildId, name);

    return interaction.reply({
      content: result ? t("selfroles-created-category", { name }) : t("selfroles-category-notfound", { name }),
      ephemeral: true,
    });
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
  async role(interaction: Discord.ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const cmd = interaction.options.getSubcommand(true);
    const itemName = interaction.options.getString("item", true);
    const role = interaction.options.getRole("role", true);

    if (cmd === "set") {
      const rawEmoji = interaction.options.getString("emoji", false);
      const description = interaction.options.getString("description", false);
      const label = interaction.options.getString("label", false);

      const emoji = rawEmoji ? this.bot.emojis.resolveIdentifier(rawEmoji) : undefined;
      await this.service.setRole(interaction.guildId, itemName, {
        emoji,
        roleId: role.id,
        description,
        label,
      });

      return interaction.reply(t("selfroles-role-updated"));
    } else if (cmd === "remove") {
      const result = await this.service.removeRole(interaction.guildId, itemName, role.id);
      return interaction.reply(result ? t("selfroles-role-removed ") : t("selfroles-role-notfound"));
    }

    throw new Error("Unknown subcommand");
  }

  @DiscordSubcommand({
    type: ApplicationCommandOptionType.SubcommandGroup,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "rename",
        options: [{ ...ID_ARG }, { name: "newname", type: ApplicationCommandOptionType.String, required: true }],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "multiselect",
        options: [{ ...ID_ARG }, { name: "allow", type: ApplicationCommandOptionType.Boolean, required: true }],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "emoji",
        options: [{ ...ID_ARG }, { name: "emoji", type: ApplicationCommandOptionType.String }],
      },
    ],
  })
  async edit(interaction: Discord.ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const item = interaction.options.getString("item", true);
    const cmd = interaction.options.getSubcommand(true) as keyof typeof subcommands;

    const subcommands = {
      rename: () => ({
        key: "name",
        value: interaction.options.getString("newname", true),
      }),
      multiselect: () => ({
        key: "multiSelect",
        value: interaction.options.getBoolean("allow", true),
      }),
      emoji: () => {
        const emoji = interaction.options.getString("newname", false);
        return {
          key: "emoji",
          value: emoji ? this.bot.emojis.resolveIdentifier(emoji) : null,
        };
      },
    };

    const { key, value } = subcommands[cmd]();

    await this.service.edit(interaction.guildId, item, key, value);

    return interaction.reply({
      ephemeral: true,
      content: t("selfroles-edit-changed", { key, value }),
    });
  }
}
