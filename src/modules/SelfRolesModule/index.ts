import { Snowflake, TextChannel, MessageEmbed, Message, MessageOptions, Guild, Role } from "discord.js";
import { SelfRolesItem, SelfRolesRole } from "@prisma/client";
import { BotModule } from "@core/decorators";
import { Bot } from "@core/Bot";
import { PrismaService } from "~/services/PrismaService";
import { SelfRolesDiscordAdapter, ROLE_ASSIGN_ID } from "./SelfRoles.discord";
import { editableFields } from "./editableFields";

export type ItemPreview = {
  id: number;
  title: string;
  color: number;
  channelName: string;
};

@BotModule({ discordAdapters: [SelfRolesDiscordAdapter] })
export class SelfRolesModule {
  constructor(private readonly prisma: PrismaService, private readonly bot: Bot) {}

  private _updated(guildId: Snowflake) {
    guildId;
    // TODO
  }

  async list(guildId: Snowflake) {
    const items = await this.prisma.selfRolesItem.findMany({
      where: { guildId },
      select: { id: true, title: true, color: true, channelId: true },
    });

    const output: ItemPreview[] = [];
    for (const item of items) {
      output.push({
        ...item,
        channelName: (await this.bot.fetchChannel<TextChannel>(item.channelId))?.name ?? "",
      });
    }
    return output;
  }

  async get(guildId: Snowflake, id: number) {
    if (!id) return null;
    return this.prisma.selfRolesItem.findUnique({
      where: { id_guildId: { id, guildId } },
      include: { roles: true },
    });
  }

  async edit(guildId: Snowflake, id: number, field: keyof typeof editableFields, value: any) {
    if (!(field in editableFields)) return false;

    if (field === "messageId") {
      await this.prisma.selfRolesItem
        .findUnique({
          where: { id_guildId: { id, guildId } },
          select: { messageId: true, channelId: true },
          rejectOnNotFound: true,
        })
        .then(async ({ messageId, channelId }) => {
          if (messageId === value) return;
          const message = await this.bot.fetchMessage(channelId, messageId);
          if (message) message.delete().catch(() => null);
        });
    }

    return this.prisma.selfRolesItem
      .update({
        where: { id_guildId: { id, guildId } },
        data: { [field]: value },
        select: { messageId: true },
      })
      .then(({ messageId }) => {
        if (messageId) this.render(guildId, id);
        return true;
      })
      .finally(() => {
        this._updated(guildId);
      });
  }

  async create(guildId: Snowflake, channelId: Snowflake) {
    const item = await this.prisma.selfRolesItem.create({
      data: {
        channelId,
        guild: { connect: { id: guildId } },
      },
      select: { id: true },
    });
    this._updated(guildId);
    return item.id;
  }

  async destroy(guildId: Snowflake, id: number) {
    const item = await this.get(guildId, id);
    if (!item) return null;

    if (item.channelId && item.messageId) {
      const message = await this.bot.fetchMessage(item.channelId, item.messageId);
      if (message) message.delete();
    }

    await this.prisma.selfRolesItem.delete({
      where: { id_guildId: { id, guildId } },
    });

    return true;
  }

  async conditionalRender(guildId: Snowflake, id: number) {
    return this.prisma.selfRolesItem
      .findUnique({
        where: { id_guildId: { id, guildId } },
        select: { messageId: true },
        rejectOnNotFound: true,
      })
      .then(({ messageId }) => {
        if (messageId) return this.render(guildId, id);
      });
  }

  async render(guildId: Snowflake, id: number) {
    const item = await this.get(guildId, id);
    if (!item) return null;

    const channel = await this.bot.fetchChannel<TextChannel>(item.channelId);
    if (!channel) throw new Error("Channel not found");
    const _message = await this.bot.fetchMessage(channel, item.messageId);
    let message = _message;
    if (!channel) return false;

    const guild = await this.bot.guilds.fetch(guildId);
    const { embed, roles } = this.generateEmbed(item, guild);
    const messageData: MessageOptions = {
      embeds: [embed],
      content: item.message,
      components: [
        {
          type: "ACTION_ROW",
          components: [
            {
              type: "SELECT_MENU",
              customId: ROLE_ASSIGN_ID + ":" + id,
              options: roles
                .filter((r) => r.role)
                .map((role) => ({
                  label: role.role!.name,
                  value: role.role!.id,
                  description: role.description,
                  emoji: role.emoji ?? undefined,
                })),
            },
          ],
        },
      ],
    };

    if (message) {
      message.edit(messageData);
    } else {
      message = (await channel.send(messageData)) as Message;

      await this.prisma.selfRolesItem.update({
        where: { id_guildId: { id, guildId } },
        data: { messageId: message.id },
        select: { id: true },
      });
      this._updated(guildId);
    }

    return true;
  }

  private generateEmbed(item: SelfRolesItem & { roles: SelfRolesRole[] }, guild: Guild) {
    const roles = item.roles
      .filter((i) => i.emoji)
      .map((role) => ({
        ...role,
        emoji: role.emoji,
        role: this.bot.resolveRole(role.role, guild),
      }));

    const embed = new MessageEmbed()
      .setTitle(item.title || "Choose your role")
      .setColor(item.color)
      .setDescription(
        (item.description ? item.description + "\n" : "") +
          (item.showHelp
            ? "React with emoji to recieve the role assigned to it, remove the reaction to lose the role.\n"
            : "") +
          (item.showHelp || item.description ? "\n" : "") +
          (item.showRoles
            ? roles
                .map(({ emoji, role, description }) => `${emoji} - ${role}` + (description ? ` - ${description}` : ""))
                .join("\n")
            : "") +
          "",
      )
      .setFooter(item.showId ? `Id: ${item.id}` : "");

    return { embed, roles };
  }

  async addRole(guildId: Snowflake, id: number, role: Snowflake) {
    return this.prisma.selfRolesRole
      .create({
        data: {
          role,
          item: { connect: { id_guildId: { id, guildId } } },
        },
        select: { id: true },
      })
      .then(() => {
        this.conditionalRender(guildId, id);
        return true;
      })
      .finally(() => {
        this._updated(guildId);
      });
  }

  async setRole(guildId: Snowflake, id: number, roleId: number, role: Role, emoji: string, ...description: string[]) {
    return this.prisma.selfRolesRole
      .update({
        where: {
          id_itemId_guildId: { id: roleId, itemId: id, guildId },
        },
        data: {
          emoji: emoji || undefined,
          role: role.id,
          description: description.join(" "),
        },
        select: { id: true },
      })
      .then(() => {
        this.conditionalRender(guildId, id);
        return true;
      })
      .finally(() => {
        this._updated(guildId);
      });
  }

  async removeRole(guildId: Snowflake, id: number, roleId: number) {
    return this.prisma.selfRolesRole
      .delete({
        where: {
          id_itemId_guildId: { id: roleId, itemId: id, guildId },
        },
      })
      .then(() => {
        this.conditionalRender(guildId, id);
        return true;
      })
      .finally(() => {
        this._updated(guildId);
      });
  }
}
