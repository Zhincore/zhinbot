import { Snowflake, TextChannel, MessageEmbed, Message, Guild, Role, Emoji } from "discord.js";
import { ReactRolesItem, ReactRolesRole } from "@prisma/client";
import { BotModule } from "@core/decorators";
import { Bot } from "@core/Bot";
import { PrismaService } from "~/services/PrismaService";
import { ReactRolesDiscordAdapter } from "./ReactRoles.discord";
import { editableFields } from "./editableFields";

export type ItemPreview = {
  id: number;
  title: string;
  color: number;
  channelName: string;
};

@BotModule({ discordAdapter: ReactRolesDiscordAdapter })
export class ReactRolesModule {
  private readonly messages = new Map<string, number>();

  constructor(private readonly prisma: PrismaService, private readonly bot: Bot) {
    // Fetch and cache existing reactroles
    prisma.reactRolesItem
      .findMany({
        select: { messageId: true, id: true, channelId: true },
        where: { NOT: [{ messageId: undefined }] },
      })
      .then((items) => {
        for (const { messageId, id, channelId } of items) {
          this.messages.set(messageId, id);

          // TODO
          bot.fetchMessage(channelId, messageId).catch(console.error);
        }
      });
  }

  private _updated(guildId: Snowflake) {
    guildId;
    // TODO
  }

  async list(guildId: Snowflake) {
    const items = await this.prisma.reactRolesItem.findMany({
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
    return this.prisma.reactRolesItem.findUnique({
      where: { id_guildId: { id, guildId } },
      include: { roles: true },
    });
  }

  async edit(guildId: Snowflake, id: number, field: keyof typeof editableFields, value: any) {
    if (!(field in editableFields)) return false;

    if (field === "messageId") {
      await this.prisma.reactRolesItem
        .findUnique({
          where: { id_guildId: { id, guildId } },
          select: { messageId: true, channelId: true },
          rejectOnNotFound: true,
        })
        .then(async ({ messageId, channelId }) => {
          if (messageId === value) return;
          this.messages.delete(messageId);
          const message = await this.bot.fetchMessage(channelId, messageId);
          if (message) message.delete().catch(() => null);
        });
    }

    return this.prisma.reactRolesItem
      .update({
        where: { id_guildId: { id, guildId } },
        data: { [field]: value },
        select: { messageId: true },
      })
      .then(({ messageId }) => {
        if (messageId) this.render(guildId, id);
        if (field === "messageId") this.messages.set(messageId, id);
        return true;
      })
      .finally(() => {
        this._updated(guildId);
      });
  }

  async create(guildId: Snowflake, { id: channelId }: TextChannel) {
    const item = await this.prisma.reactRolesItem.create({
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

    await this.prisma.reactRolesItem.delete({
      where: { id_guildId: { id, guildId } },
    });

    return true;
  }

  async conditionalRender(guildId: Snowflake, id: number) {
    return this.prisma.reactRolesItem
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
    if (item.messageId && !message) this.messages.delete(item.messageId);

    const guild = await this.bot.guilds.fetch(guildId);

    const { embed, roles } = this.generateMessage(item, guild);
    const messageData = { embeds: [embed], content: item.message };
    if (message) message.edit(messageData);
    else {
      message = (await channel.send(messageData)) as Message;

      await this.prisma.reactRolesItem.update({
        where: { id_guildId: { id, guildId } },
        data: { messageId: message.id },
        select: { id: true },
      });
      this.messages.set(message.id, id);
      this._updated(guildId);
    }

    // remove obsolete reactions
    for (const reaction of message.reactions.cache.values()) {
      if (!roles.some(({ emoji }) => emoji?.identifier === reaction.emoji.identifier)) {
        reaction.remove();
      }
    }

    // add all reactions
    let reactionPromise = Promise.resolve();
    for (const { emoji } of roles) {
      if (!emoji) continue;
      reactionPromise = reactionPromise.then(() => {
        message.react(emoji.identifier);
      });
    }

    return true;
  }

  private generateMessage(item: ReactRolesItem & { roles: ReactRolesRole[] }, guild: Guild) {
    const roles = item.roles
      .filter((i) => i.emoji)
      .map((role) => ({
        ...role,
        emoji: this.bot.resolveEmoji(role.emoji),
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

  async addRole(guildId: Snowflake, id: number, role: Role) {
    return this.prisma.reactRolesRole
      .create({
        data: {
          role: role.id,
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

  async setRole(guildId: Snowflake, id: number, roleId: number, role: Role, emoji: Emoji, ...description: string[]) {
    return this.prisma.reactRolesRole
      .update({
        where: {
          id_itemId_guildId: { id: roleId, itemId: id, guildId },
        },
        data: {
          emoji: (emoji && (emoji.url ? emoji.id : emoji.name)) || undefined,
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
    return this.prisma.reactRolesRole
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
