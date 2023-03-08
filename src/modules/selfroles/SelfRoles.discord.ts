import { SelfRolesItem } from "@prisma/client";
import Discord, { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { DiscordAdapter, DiscordCommand, DiscordHandler, type TranslateFn } from "@core/index.js";
import { SelfRolesItemRoles, SelfRolesService } from "./SelfRoles.service.js";

const ROLES_ID = "selfroles.roles";
const SHOW_CATEGORIES_ID = "selfroles.categories";
const SHOW_CATEGORY_ID = "selfroles.category";
const ROLES_CHOOSEN_ID = "selfroles.chosen";

const CHOOSECATEGORY_KEY = "selfroles-roles-choosecategory";

@DiscordAdapter()
export class SelfRolesDiscordAdapter {
  constructor(private readonly service: SelfRolesService) {}

  private getCategoryButtons(selfroles: SelfRolesItem[]) {
    return new ActionRowBuilder<Discord.MessageActionRowComponentBuilder>({
      components: selfroles.map(
        (item) =>
          new ButtonBuilder({
            customId: SHOW_CATEGORY_ID + ":" + item.name,
            label: item.name,
            emoji: item.emoji || undefined,
            style: ButtonStyle.Secondary,
          }),
      ),
    });
  }

  private async getRoleSelector(item: SelfRolesItemRoles, member: Discord.GuildMember, placeholder: string) {
    return new ActionRowBuilder<Discord.MessageActionRowComponentBuilder>({
      components: [
        new StringSelectMenuBuilder({
          custom_id: ROLES_CHOOSEN_ID + ":" + item.name,
          max_values: item.multiSelect ? item.roles.length : 1,
          placeholder: placeholder,
          options: item.roles.map((role) => ({
            label: role.label || role.role.name,
            value: role.roleId,
            emoji: role.emoji || undefined,
            description: role.description || undefined,
            default: member.roles.cache.has(role.roleId),
          })),
        }),
      ],
    });
  }

  @DiscordCommand({
    name: "rolesbutton",
    options: [
      {
        name: "channel",
        type: Discord.ApplicationCommandOptionType.Channel,
        channel_types: [Discord.ChannelType.GuildText],
      },
      { name: "message", type: Discord.ApplicationCommandOptionType.String },
      { name: "label", type: Discord.ApplicationCommandOptionType.String },
    ],
  })
  async createRolesButton(interaction: Discord.ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    let channel = interaction.options.getChannel("channel", false);
    const label = interaction.options.getString("label", false);
    const message = interaction.options.getString("message", false);

    if (!channel) channel = interaction.channel!;
    if (channel.type != Discord.ChannelType.GuildText) throw new Error("Channel is not text");

    await channel.send({
      content: message ?? undefined,
      components: [
        new ActionRowBuilder<Discord.MessageActionRowComponentBuilder>({
          components: [
            new ButtonBuilder({
              customId: ROLES_ID,
              label: label || t("selfroles-roles-button"),
              style: ButtonStyle.Primary,
            }),
          ],
        }),
      ],
    });

    return interaction.reply({
      ephemeral: true,
      content: t("selfroles-created-roles-button"),
    });
  }

  @DiscordHandler(ROLES_ID)
  @DiscordCommand({
    defaultMemberPermissions: Discord.PermissionFlagsBits.AddReactions,
  })
  async roles(interaction: Discord.ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const selfroles = await this.service.getAll(interaction.guildId);

    if (!selfroles) {
      return interaction.reply({
        ephemeral: true,
        content: t("selfroles-roles-noitems"),
      });
    }

    return interaction.reply({
      ephemeral: true,
      content: t(CHOOSECATEGORY_KEY) + ":",
      components: [this.getCategoryButtons(selfroles)],
    });
  }

  @DiscordHandler(SHOW_CATEGORY_ID)
  async roleSelector(interaction: Discord.ButtonInteraction<"cached">, t: TranslateFn) {
    const name = interaction.customId.split(":")[1];
    const item = await this.service.get(interaction.guildId, name);
    if (!item) throw new Error(`Selfroles ${name} don't exist`);

    return interaction.update({
      content: t("selfroles-roles-chooseroles", { category: name }),
      components: [
        await this.getRoleSelector(item, interaction.member, t("selfroles-roles-chooseroles", { category: name })),
        new ActionRowBuilder<Discord.MessageActionRowComponentBuilder>({
          components: [
            new ButtonBuilder({
              customId: SHOW_CATEGORIES_ID,
              label: "Go back",
              style: ButtonStyle.Secondary,
            }),
          ],
        }),
      ],
    });
  }

  @DiscordHandler(ROLES_CHOOSEN_ID)
  async assignRoles(interaction: Discord.StringSelectMenuInteraction<"cached">, t: TranslateFn) {
    const name = interaction.customId.split(":")[1];
    const item = await this.service.get(interaction.guildId, name);
    if (!item || interaction.values.some((r) => item.roles.findIndex((a) => a.roleId == r) == -1)) {
      return interaction.update({ components: [], content: t("selfroles-outdated") });
    }

    const unselectedRoles = interaction.component.options
      .map((v) => v.value)
      .filter((v) => !interaction.values.includes(v));

    await interaction.member.roles.add(interaction.values, "Self-roles");
    await interaction.member.roles.remove(unselectedRoles, "Self-roles");

    const selfroles = await this.service.getAll(interaction.guildId);

    return interaction.update({
      content: "**" + t("selfroles-roles-rolesupdated") + "**\n\n" + t(CHOOSECATEGORY_KEY) + ":",
      components: [this.getCategoryButtons(selfroles)],
    });
  }

  @DiscordHandler(SHOW_CATEGORIES_ID)
  async goBack(interaction: Discord.StringSelectMenuInteraction<"cached">, t: TranslateFn) {
    const selfroles = await this.service.getAll(interaction.guildId);

    return interaction.update({
      content: t(CHOOSECATEGORY_KEY) + ":",
      components: [this.getCategoryButtons(selfroles)],
    });
  }
}
