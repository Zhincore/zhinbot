import Discord, { Snowflake } from "discord.js";
import { SelfRolesItem, SelfRolesRole, Prisma } from "@prisma/client";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { PrismaService } from "~/services/Prisma.service";

export type ItemPreview = {
  name: string;
};

export type SelfRolesItemRoles = SelfRolesItem & {
  roles: (SelfRolesRole & { role: Discord.Role })[];
};

@Service()
export class SelfRolesService {
  private messages = new Map<Snowflake, SelfRolesItem & { roles: SelfRolesRole[] }>();

  constructor(private readonly prisma: PrismaService, private readonly bot: Bot) {
    // React to reactions
    bot.on("messageReactionAdd", this.getReactionHandler("add"));
    bot.on("messageReactionRemove", this.getReactionHandler("remove"));
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

  async getAll(guildId: Snowflake) {
    return this.prisma.selfRolesItem.findMany({
      where: { guildId },
    });
  }

  async get(guildId: Snowflake, name: string): Promise<SelfRolesItemRoles | null> {
    const guild = await this.bot.guilds.fetch(guildId);
    return this.prisma.selfRolesItem
      .findUnique({
        where: { guildId_name: { guildId, name } },
        include: { roles: true },
      })
      .then((item) =>
        item
          ? {
              ...item,
              roles: item.roles.map((role) => ({
                ...role,
                role: this.bot.resolveRole(role.roleId, guild)!,
              })),
            }
          : null,
      );
  }

  async search(guildId: Snowflake, name: string) {
    return this.prisma.selfRolesItem.findMany({
      where: {
        guildId,
        name: {
          startsWith: name,
        },
      },
      select: { name: true },
    });
  }

  async edit(guildId: Snowflake, name: string, property: string, value: unknown) {
    return this.prisma.selfRolesItem.update({
      where: { guildId_name: { guildId, name } },
      data: { [property]: value },
    });
  }

  async create(guildId: Snowflake, name: string) {
    const item = await this.prisma.selfRolesItem.create({
      data: {
        name,
        guild: { connect: { id: guildId } },
      },
    });
    return item.name;
  }

  async destroy(guildId: Snowflake, name: string) {
    const item = await this.get(guildId, name);
    if (!item) return null;

    await this.prisma.selfRolesItem.delete({ where: { guildId_name: { guildId, name } } });

    return true;
  }

  async setRole(guildId: Snowflake, itemName: string, data: Omit<Prisma.SelfRolesRoleCreateInput, "item">) {
    return this.prisma.selfRolesRole.upsert({
      where: {
        guildId_itemName_roleId: { guildId, itemName, roleId: data.roleId },
      },
      create: {
        ...data,
        item: { connect: { guildId_name: { guildId, name: itemName } } },
      },
      update: data,
      select: { roleId: true },
    });
  }

  async removeRole(guildId: Snowflake, itemName: string, roleId: Snowflake) {
    return this.prisma.selfRolesRole.delete({ where: { guildId_itemName_roleId: { guildId, itemName, roleId } } });
  }
}
