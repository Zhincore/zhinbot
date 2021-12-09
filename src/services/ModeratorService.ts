import Discord, { Snowflake, Permissions } from "discord.js";
import ms from "ms";
import Prisma from "@prisma/client";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { PrismaService } from "~/services/PrismaService";
import { Config } from "~/Config";

export type ControlRole = "categ" | "muted";

export const roleToRoleIdField: {
  [role in ControlRole]: `${role}RoleId` extends keyof Prisma.ModeratorConfig ? `${role}RoleId` : never;
} = {
  categ: "categRoleId",
  muted: "mutedRoleId",
};

export const controlRoles = Object.keys(roleToRoleIdField);

@Service()
export class ModeratorService {
  private readonly guildMutes = new Map<Snowflake, Map<Snowflake, NodeJS.Timeout>>();

  constructor(private readonly bot: Bot, private readonly prisma: PrismaService, private readonly config: Config) {
    bot.on("ready", this.initialize.bind(this));
  }

  private getModConfig(guildId: Snowflake) {
    return this.prisma.moderatorConfig.findUnique({ where: { guildId } });
  }

  private async initialize() {
    const mutes = await this.prisma.mutes.findMany();

    await Promise.all(
      mutes.map(async (mute) => {
        const modConfig = await this.getModConfig(mute.guildId);
        const guild = this.bot.guilds.resolve(mute.guildId);
        if (!guild || !modConfig?.mutedRoleId) return;

        const duration = mute.end.valueOf() - Date.now();
        if (duration <= 0) {
          // Unmute overdue mutes
          return this.unmute(mute.guildId, mute.userId);
        } else {
          // Re-mute mutes to ensure timeout
          return this.mute(mute.guildId, mute.userId, duration);
        }
      }),
    );
  }

  private async prepareRole(guild: Discord.Guild, roleName: ControlRole) {
    if (roleName === "categ") throw "This role cannot be assigned to users";
    const modConfig = await this.getModConfig(guild.id);
    const roleId = modConfig ? modConfig[roleToRoleIdField[roleName]] : null;
    const categId = modConfig?.categRoleId;

    const channelsPromise = guild.channels.fetch();
    const [fetchedRole, categ] = await Promise.all([
      roleId ? guild.roles.fetch(roleId) : null,
      categId ? guild.roles.fetch(categId) : null,
    ]);
    let roleIdUpdate = false;
    let role = fetchedRole;

    if (!role) {
      roleIdUpdate = true;

      // Try to find the role by name
      const roles = await guild.roles.fetch();
      const foundRole = roles.find((_role) => _role.name === roleName);
      if (foundRole) role = foundRole;
      else {
        // Create the role
        role = await guild.roles.create({
          permissions: new Permissions([]),
          name: roleName,
          position: categ ? categ.position - 1 : undefined,
        });
      }
    } else if (categ) {
      // Ensure role's position under category
      await role.setPosition(categ.position - 1);
    }

    await Promise.all([
      ...Array.from((await channelsPromise).values(), (channel) => {
        if (channel.permissionsLocked) return;
        return channel.permissionOverwrites.edit(role!, this.config.moderator.rolePerms[roleName]);
      }),
      roleIdUpdate && this.updateRoleId(guild.id, roleName, role.id),
    ]);

    return role!;
  }

  private async assignRole(guildId: Snowflake, userId: Snowflake, roleName: ControlRole) {
    const guild = this.bot.guilds.resolve(guildId)!;

    const [member, role] = await Promise.all([guild.members.fetch(userId), this.prepareRole(guild, roleName)]);
    if (!member) throw "Member not found";

    if (member.roles.cache.has(role.id)) return false;
    await member.roles.add(role);
    return true;
  }

  async updateRoleId(guildId: Snowflake, roleName: ControlRole, roleId?: Snowflake) {
    const field = roleToRoleIdField[roleName];
    return this.prisma.guild.update({
      where: { id: guildId },
      data: { moderator: { update: { [field]: roleId } } },
    });
  }

  async updateModUpdatesChannel(guildId: Snowflake, channelId?: Snowflake) {
    return this.prisma.guild.update({
      where: { id: guildId },
      data: { moderator: { update: { modUpdatesChannel: channelId } } },
    });
  }

  async mute(guildId: Snowflake, userId: Snowflake, duration?: number) {
    if (duration) duration = Math.max(this.config.moderator.minPunishmentDuration, duration);

    let guildTimeouts = this.guildMutes.get(guildId);
    const timeout = guildTimeouts?.get(userId);
    if (timeout) clearTimeout(timeout);

    if (duration) {
      if (!guildTimeouts) this.guildMutes.set(guildId, (guildTimeouts = new Map()));
      guildTimeouts.set(userId, setTimeout(() => this.unmute(guildId, userId), duration).unref());
    }

    const end = new Date(Date.now() + (duration ?? 0));
    const [muted] = await Promise.all([
      this.assignRole(guildId, userId, "muted"),
      duration &&
        this.prisma.mutes.upsert({
          where: { guildId_userId: { guildId, userId } },
          create: { end, userId, guildId },
          update: { end },
        }),
    ]);

    const modConfig = await this.getModConfig(guildId);
    if (muted && modConfig?.modUpdatesChannel) {
      const channel = await this.bot.channels.fetch(modConfig?.modUpdatesChannel);
      if (channel?.isText()) {
        channel.send(
          `<@${userId}> has been muted ${duration ? "for " + ms(duration, { long: true }) : "indefinitely"}`,
        );
      }
    }

    return duration;
  }

  async unmute(guildId: Snowflake, userId: Snowflake) {
    const modConfig = await this.getModConfig(guildId);

    const guild = this.bot.guilds.resolve(guildId);
    if (!guild || !modConfig?.mutedRoleId) return;

    const guildTimeouts = this.guildMutes.get(guildId);
    const timeout = guildTimeouts?.get(userId);
    if (guildTimeouts && timeout) {
      clearTimeout(timeout);
      guildTimeouts.delete(userId);
      // If no more mutes exist in guild, delete the map
      if (!guildTimeouts.size) this.guildMutes.delete(guildId);
    }

    const muteQuery = { where: { guildId_userId: { guildId, userId } } };
    const deletePromise = this.prisma.mutes
      .findUnique(muteQuery)
      .then((mute) => mute && this.prisma.mutes.delete(muteQuery));

    const member = await guild.members.fetch(userId);
    const unmute = member?.roles.cache.has(modConfig.mutedRoleId);

    await Promise.all([
      unmute && member.roles.remove(modConfig.mutedRoleId),
      unmute &&
        modConfig?.modUpdatesChannel &&
        this.bot.channels
          .fetch(modConfig.modUpdatesChannel)
          .then((channel): any => channel?.isText() && channel.send(`<@${userId}> has been unmuted`)),
      deletePromise,
    ]);
    return unmute;
  }
}
