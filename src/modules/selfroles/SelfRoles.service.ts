import Discord, { Snowflake } from "discord.js";
import { SelfRolesItem, SelfRolesRole, Prisma } from "@prisma/client";
import ms from "ms";
import { Service } from "@core/decorators/index.js";
import { Bot } from "@core/Bot/index.js";
import { PrismaService } from "~/services/Prisma.service.js";
import { Cache } from "~/utils/Cache.js";

export type ItemPreview = {
  name: string;
};

export type SelfRolesItemRoles = SelfRolesItem & {
  roles: (SelfRolesRole & { role: Discord.Role })[];
};

@Service()
export class SelfRolesService {
  private readonly autoroles = new Cache<Snowflake | null>(ms("30m"));

  constructor(private readonly prisma: PrismaService, private readonly bot: Bot) {
    bot.on("guildMemberAdd", this.handleAutoMember.bind(this));
    bot.on("guildMemberUpdate", this.handleAutoMember.bind(this));
  }

  private async handleAutoMember(
    member: Discord.GuildMember | Discord.PartialGuildMember,
    newMember?: Discord.GuildMember,
  ) {
    const autorole = await this.getAutorole(member.guild.id);
    if (!autorole || newMember?.pending || member.pending) return;
    await member.roles.add(autorole);
  }

  async getAutorole(guildId: Snowflake) {
    let role = this.autoroles.get(guildId);
    if (role != undefined) return role;

    role = await this.prisma.guild
      .findUnique({ where: { id: guildId }, select: { autorole: true } })
      .then((d) => d?.autorole);
    if (role != undefined) this.autoroles.set(guildId, role);

    return role;
  }

  async setAutorole(guildId: Snowflake, role?: Snowflake | null, applyNow?: boolean | null) {
    const previous = applyNow && (await this.getAutorole(guildId));
    if (previous == role) return;

    const result = await this.prisma.guild.update({
      where: { id: guildId },
      data: { autorole: role ?? null },
      select: { autorole: true },
    });

    this.autoroles.set(guildId, result.autorole);

    if (!applyNow || (!previous && !result.autorole)) return;

    const guild = await this.bot.guilds.fetch(guildId);
    const members = await guild.members.list();
    const promises: Promise<any>[] = [];

    for (const [_memberId, member] of members) {
      if (previous) {
        promises.push(member.roles.remove(previous, "Autorole changed"));
      }
      if (result.autorole) {
        promises.push(member.roles.add(result.autorole, "Autorole changed"));
      }
    }

    await Promise.allSettled(promises);
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

  async create(guildId: Snowflake, name: string, emoji?: string | null, multiSelect?: boolean) {
    const item = await this.prisma.selfRolesItem.create({
      data: {
        name,
        emoji,
        multiSelect,
        guild: { connect: { id: guildId } },
      },
    });
    return item.name;
  }

  async delete(guildId: Snowflake, name: string) {
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
