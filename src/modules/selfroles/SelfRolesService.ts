import Discord, { Snowflake } from "discord.js";
import { SelfRolesItem, SelfRolesRole } from "@prisma/client";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { editableFields } from "./editableFields";
import { PrismaService } from "~/services/PrismaService";

export type ItemPreview = {
  name: string;
  title: string;
  color: number;
  channelName: string;
};

@Service()
export class SelfRolesService {
  private messages = new Map<Snowflake, SelfRolesItem & { roles: SelfRolesRole[] }>();

  constructor(private readonly prisma: PrismaService, private readonly bot: Bot) {
    // React to reactions
    bot.on("messageReactionAdd", this.getReactionHandler("add"));
    bot.on("messageReactionRemove", this.getReactionHandler("remove"));

    // Prefetch items
    bot.on("ready", async () => {
      await this.prefetchItems();
    });
  }

  private getReactionHandler(action: "add" | "remove") {
    return async (
      reaction: Discord.MessageReaction | Discord.PartialMessageReaction,
      user: Discord.User | Discord.PartialUser,
    ): Promise<any> => {
      if (reaction.partial || user.bot) return;
      const { message, emoji } = reaction;
      if (message.partial || !message.guild) return;

      const item = this.messages.get(reaction.message.id);
      if (!item) return;

      const role = item.roles.find((r) => this.bot.serializeEmoji(emoji) === r.emoji);
      if (!role) return reaction.remove();

      const member = await message.guild.members.fetch(user.id);
      if (action === "add") return member.roles.add(role.roleId);
      return member.roles.remove(role.roleId);
    };
  }

  private async prefetchItems() {
    return this.prisma.selfRolesItem
      .findMany({ where: { messageId: { not: null } }, include: { roles: true } })
      .then((items) =>
        Promise.all(
          items.map(async (item) => {
            try {
              const message = await this.bot.fetchMessage(item.channelId, item.messageId);
              // If message doesn't exist, remove it's Id from DB
              if (!message) {
                return this.prisma.selfRolesItem.update({
                  where: { guildId_name: item },
                  data: { messageId: null },
                });
              }
            } catch (err) {
              // If the channel wasn't found, delete the item
              if (err instanceof Error && err.message === "Channel not found") {
                return this.prisma.selfRolesItem.delete({ where: { guildId_name: item } });
              }
              throw err;
            }
            // Save in cache
            this.messages.set(item.messageId!, item);
          }),
        ),
      );
  }

  private _updated(guildId: Snowflake) {
    guildId;
    // TODO
  }

  async list(guildId: Snowflake) {
    const items = await this.prisma.selfRolesItem.findMany({
      where: { guildId },
      select: { name: true, title: true, color: true, channelId: true },
    });

    const output: ItemPreview[] = [];
    for (const item of items) {
      output.push({
        ...item,
        channelName: (await this.bot.fetchChannel<Discord.TextChannel>(item.channelId))?.name ?? "",
      });
    }
    return output;
  }

  async get(guildId: Snowflake, name: string) {
    if (!name) return null;
    const item = await this.prisma.selfRolesItem.findUnique({
      where: { guildId_name: { guildId, name } },
      include: { roles: true },
    });
    if (item && item.guildId !== guildId) return null;

    // Update cache
    if (item?.messageId && this.messages.has(item.messageId)) this.messages.set(item.messageId, item);

    return item;
  }

  async search(guildId: Snowflake, name: string) {
    return this.prisma.selfRolesItem.findMany({
      where: {
        guildId,
        name: {
          contains: name,
        },
      },
      select: { name: true, color: true },
    });
  }

  async edit(guildId: Snowflake, name: string, field: keyof typeof editableFields, value: any) {
    if (!(field in editableFields)) return false;

    if (field === "messageId") {
      await this.prisma.selfRolesItem
        .findUnique({
          where: { guildId_name: { guildId, name } },
          select: { messageId: true, channelId: true },
          rejectOnNotFound: true,
        })
        .then(async ({ messageId, channelId }) => {
          if (messageId === value || !messageId) return;
          this.messages.delete(messageId);
          const message = await this.bot.fetchMessage(channelId, messageId);
          if (message) message.delete().catch(() => null);
        });
    }

    return this.prisma.selfRolesItem
      .update({
        where: { guildId_name: { guildId, name } },
        data: { [field]: value },
        select: { messageId: true },
      })
      .then(({ messageId }) => {
        if (messageId) this.render(guildId, name);
        return true;
      })
      .finally(() => {
        this._updated(guildId);
      });
  }

  async create(guildId: Snowflake, name: string) {
    const item = await this.prisma.selfRolesItem.create({
      data: {
        name,
        guild: { connect: { id: guildId } },
      },
    });
    this._updated(guildId);
    return item.name;
  }

  async destroy(guildId: Snowflake, name: string) {
    const item = await this.get(guildId, name);
    if (!item) return null;

    if (item.channelId && item.messageId) {
      const message = await this.bot.fetchMessage(item.channelId, item.messageId);
      if (message) message.delete();
    }

    await this.prisma.selfRolesItem.delete({ where: { guildId_name: { guildId, name } } });

    return true;
  }

  async conditionalRender(guildId: Snowflake, name: string) {
    return this.prisma.selfRolesItem
      .findUnique({
        where: { guildId_name: { guildId, name } },
        select: { messageId: true },
        rejectOnNotFound: true,
      })
      .then(({ messageId }) => {
        if (messageId) return this.render(guildId, name);
        return true;
      });
  }

  async render(guildId: Snowflake, name: string) {
    const item = await this.get(guildId, name);
    if (!item) return null;

    const channel = item.channelId && (await this.bot.fetchChannel<Discord.TextChannel>(item.channelId));
    if (!channel) throw new Error("Channel not found");
    const _message = await this.bot.fetchMessage(channel, item.messageId ?? undefined);
    let message = _message;
    if (!channel) return false;

    /// Do Discord.Message
    const guild = await this.bot.guilds.fetch(guildId);
    const { embed, roles } = this.generateEmbed(item, guild);
    const messageData: Discord.MessageOptions = {
      embeds: [embed],
      content: item.message || undefined,
      // components: [
      //   {
      //     type: "ACTION_ROW",
      //     components: [
      //       {
      //         type: "SELECT_MENU",
      //         customId: ROLE_ASSIGN_ID + ":" + id,
      //         options: roles
      //           .filter((r) => r.role)
      //           .map((role) => ({
      //             label: role.role!.name,
      //             value: role.role!.id,
      //             description: role.description,
      //             emoji: role.emoji ?? undefined,
      //           })),
      //       },
      //     ],
      //   },
      // ],
    };

    if (message) {
      await message.edit(messageData);
    } else {
      message = (await channel.send(messageData)) as Discord.Message;

      await this.prisma.selfRolesItem.update({
        where: { guildId_name: { guildId, name } },
        data: { messageId: message.id },
      });
      this.messages.set(message.id, item);
      this._updated(guildId);
    }

    /// Do reactions
    const rolesEmojis = roles.map((r) => r.emoji);
    const reactions = Array.from(message.reactions.cache.values());

    // Remove redundant reactions
    const removeReacts = reactions.filter((r) => !rolesEmojis.includes(this.bot.serializeEmoji(r.emoji) ?? ""));
    await Promise.all(removeReacts.map((react) => react.remove()));

    // Add missing reactions
    const reactionsEmojis = reactions.map((r) => this.bot.serializeEmoji(r.emoji));
    const addReacts = rolesEmojis.filter((e) => !reactionsEmojis.includes(e));

    let reactPromise: Promise<any> = Promise.resolve();
    for (const emoji of addReacts) {
      reactPromise = reactPromise.then(() => message!.react(emoji!));
    }
    await reactPromise;

    return true;
  }

  private generateEmbed(item: SelfRolesItem & { roles: SelfRolesRole[] }, guild: Discord.Guild) {
    const roles = item.roles
      .filter((i) => i.emoji)
      .map((role) => ({
        ...role,
        emoji: role.emoji,
        role: this.bot.resolveRole(role.roleId, guild),
      }));

    const embed = new Discord.MessageEmbed()
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
                .map(
                  ({ emoji, role, description }) =>
                    `${this.bot.resolveEmoji(emoji!)} - ${role}` + (description ? ` - ${description}` : ""),
                )
                .join("\n")
            : "") +
          "",
      )
      .setFooter(item.showName ? `Name: ${item.name}` : "");

    return { embed, roles };
  }

  async setRole(guildId: Snowflake, itemName: string, roleId: Snowflake, emoji?: string, description?: string) {
    const data = {
      emoji: emoji,
      roleId,
      description: description,
    };

    return this.prisma.selfRolesRole
      .upsert({
        where: {
          guildId_itemName_roleId: { guildId, itemName, roleId },
        },
        create: {
          ...data,
          item: { connect: { guildId_name: { guildId, name: itemName } } },
        },
        update: data,
        select: { roleId: true },
      })
      .then(() => this.conditionalRender(guildId, itemName))
      .finally(() => {
        this._updated(guildId);
      });
  }

  async removeRole(guildId: Snowflake, itemName: string, roleId: Snowflake) {
    return this.prisma.selfRolesRole
      .delete({ where: { guildId_itemName_roleId: { guildId, itemName, roleId } } })
      .then(() => this.conditionalRender(guildId, itemName))
      .finally(() => {
        this._updated(guildId);
      });
  }
}
