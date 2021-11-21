import { BaseCommandInteraction, CommandInteraction, ApplicationCommandChoicesOption } from "discord.js";
import Color from "color";
import { Bot } from "@core/Bot";
import { table } from "@core/utils";
import { Inject, DiscordAdapter, DiscordSubcommand } from "@core/decorators";
import { ReactRolesModule } from "./";
import { editableFields, FieldTransform } from "./editableFields";

const ID_ARG: ApplicationCommandChoicesOption & { min_value?: number } = {
  name: "id",
  type: "INTEGER",
  description: "id of the item",
  required: true,
  min_value: 0,
};

@DiscordAdapter({
  supercomand: {
    name: "reactroles",
    description: "Allow your members to give themselves roles by reacting to a message.",
    defaultPermission: false,
  },
})
export class ReactRolesDiscordAdapter {
  constructor(@Inject(() => ReactRolesModule) private readonly service: ReactRolesModule, private readonly bot: Bot) {}

  @DiscordSubcommand({ description: "Get all reaction-roles of the guild" })
  async list(interaction: BaseCommandInteraction) {
    const result = await this.service.list(interaction.guildId);
    interaction.reply(table(result));
  }

  @DiscordSubcommand({ description: "Get info about a reaction-roles item", options: [ID_ARG] })
  async get(interaction: BaseCommandInteraction) {
    const result = await this.service.get(interaction.guildId, +interaction.options.get("id", true).value!);
    const guild = await this.bot.guilds.fetch(interaction.guildId);

    interaction.reply(
      result
        ? "```yaml\n" +
            Object.entries(result)
              .filter(([field]) => field === "id" || field in editableFields)
              .map(
                ([field, value]) =>
                  `${field}: ${value}${
                    field in editableFields ? " # " + editableFields[field as keyof typeof editableFields] : ""
                  }`,
              )
              .join("\n") +
            "roles:\n" +
            result.roles
              .map((role) =>
                [
                  `  - id: ${role.id}`,
                  `    emoji: ${this.bot.resolveEmoji(role.emoji)}`,
                  `    role: ${this.bot.resolveRole(role.role, guild)}`,
                  `    description: ${role.description}`,
                ].join("\n"),
              )
              .join("\n") +
            "\n```"
        : "Item not found",
    );
  }

  @DiscordSubcommand({
    description: "Edit a react-roles item",
    type: "SUB_COMMAND_GROUP",
    options: Object.keys(editableFields).map((field) => ({
      name: field,
      description: `Edit the '${field}' field`,
      type: "SUB_COMMAND",
      options: [
        ID_ARG,
        {
          name: "value",
          type: editableFields[field as keyof typeof editableFields]!.type as "STRING",
          description: `New value of the field '${field}'`,
          required: true,
        },
      ],
    })),
  })
  async edit(interaction: CommandInteraction) {
    const fieldName = interaction.options.getSubcommand(true);
    const id = interaction.options.getInteger("id", true);
    const value = interaction.options.get("value", true);
    const field = editableFields[fieldName];
    if (!field) throw new Error("Unknown field");

    let _value: any;

    if (field.transform && field.transform === FieldTransform.COLOR) {
      _value = Color(value.value as string).hex();
    } else if (value.type === "CHANNEL") {
      _value = value.channel!.id;
    } else {
      _value = value.value!;
    }

    const result = await this.service.edit(interaction.guildId, id, field.name, _value);

    interaction.reply({ content: result ? "Successfully edited" : "Editing failed", ephemeral: true });
  }
}
