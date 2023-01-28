import { SelfRolesItem } from "@prisma/client";
import Discord, { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { DiscordAdapter, DiscordCommand, DiscordHandler, type TranslateFn } from "~/core";
import { SelfRolesItemRoles, SelfRolesService } from "./SelfRoles.service";

const ROLE_CHOOSER_ID = "selfroles.category";
const ROLES_CHOOSEN_ID = "selfroles.roles";

@DiscordAdapter()
export class SelfRolesDiscordAdapter {
  constructor(private readonly service: SelfRolesService) {}

  getCategoryButtons(selfroles: SelfRolesItem[]) {
    return new ActionRowBuilder<Discord.MessageActionRowComponentBuilder>({
      components: selfroles.map(
        (item) =>
          new ButtonBuilder({
            customId: ROLE_CHOOSER_ID + ":" + item.name,
            label: item.name,
            emoji: item.emoji || undefined,
            style: ButtonStyle.Secondary,
          }),
      ),
    });
  }

  async getRoleSelector(item: SelfRolesItemRoles, member: Discord.GuildMember, placeholder: string) {
    return new ActionRowBuilder<Discord.MessageActionRowComponentBuilder>({
      components: [
        new StringSelectMenuBuilder({
          custom_id: ROLES_CHOOSEN_ID,
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

  @DiscordCommand({})
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
      content: t("selfroles-roles-choosecategory") + ":",
      components: [this.getCategoryButtons(selfroles)],
    });
  }

  @DiscordHandler(ROLE_CHOOSER_ID)
  async roleSelector(interaction: Discord.ButtonInteraction<"cached">, t: TranslateFn) {
    const name = interaction.customId.split(":")[1];
    const item = await this.service.get(interaction.guildId, name);
    if (!item) throw new Error(`Selfroles ${name} don't exist`);

    return interaction.update({
      content: t("selfroles-roles-chooseroles"),
      components: [await this.getRoleSelector(item, interaction.member, t("selfroles-roles-chooseroles"))],
    });
  }

  @DiscordHandler(ROLES_CHOOSEN_ID)
  async assignRoles(interaction: Discord.StringSelectMenuInteraction<"cached">, t: TranslateFn) {
    const unselectedRoles = interaction.component.options
      .map((v) => v.value)
      .filter((v) => !interaction.values.includes(v));

    await interaction.member.roles.add(interaction.values, "Self-roles");
    await interaction.member.roles.remove(unselectedRoles, "Self-roles");

    const selfroles = await this.service.getAll(interaction.guildId);

    return interaction.update({
      content: "**" + t("selfroles-roles-rolesassigned") + "**\n\n" + t("selfroles-roles-choosecategory") + ":",
      components: [this.getCategoryButtons(selfroles)],
    });
  }
}
