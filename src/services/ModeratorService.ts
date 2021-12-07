import Discord, { Snowflake, Permissions } from "discord.js";
import Prisma from "@prisma/client";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { PrismaService } from "~/services/PrismaService";
import { Config } from "~/Config";

export type ControlRoles = "muted";

const roleToRoleIdField: {
  [role in ControlRoles]: `${role}RoleId` extends keyof Prisma.Moderator ? `${role}RoleId` : never;
} = {
  muted: "mutedRoleId",
};

@Service()
export class ModerationService {
  private readonly guildData = new Map<Snowflake, Prisma.Moderator>();
  private readonly guildMutes = new Map<Snowflake, Map<Snowflake, NodeJS.Timeout>>();

  constructor(private readonly bot: Bot, private readonly prisma: PrismaService, private readonly config: Config) {
    this.initialize().catch(console.error);
  }

  private async initialize() {
    // Start fetching mutes
    const mutesPromise = this.prisma.mutes.findMany();

    // Fetch and cache guild data
    const guildData = await this.prisma.moderator.findMany();
    for (const item of guildData) {
      this.guildData.set(item.guildId, item);
    }

    await mutesPromise.then((mutes) =>
      Promise.all(
        mutes.map(async (mute) => {
          const guildData = this.guildData.get(mute.guildId);
          const guild = this.bot.guilds.resolve(mute.guildId);
          if (!guild || !guildData || !guildData.mutedRoleId) return;

          const duration = Date.now() - mute.end.valueOf();
          if (duration <= 0) {
            // Unmute overdue mutes
            return this.unmute(mute.guildId, mute.userId);
          } else {
            // Re-mute mutes to ensure timeout
            return this.mute(mute.guildId, mute.userId, duration);
          }
        }),
      ),
    );
  }

  private async prepareRole(guild: Discord.Guild, roleName: ControlRoles) {
    const guildData = this.guildData.get(guild.id);
    const roleId = guildData ? guildData[roleToRoleIdField[roleName]] : null;
    const categId = guildData?.roleCategId;

    const channelsPromise = guild.channels.fetch();
    const [fetchedRole, categ] = await Promise.all([
      roleId ? guild.roles.fetch(roleId) : null,
      categId ? guild.roles.fetch(categId) : null,
    ]);
    let role = fetchedRole;

    if (!role) {
      // Create the role
      role = await guild.roles.create({
        permissions: new Permissions([]),
        name: roleName,
        position: categ ? categ.position + 1 : undefined,
      });
    } else if (categ) {
      // Ensure role's position under category
      await role.setPosition(categ.position + 1);
    }

    await Promise.all(
      Array.from((await channelsPromise).values(), (channel) => {
        if (channel.permissionsLocked) return;
        return channel.permissionOverwrites.edit(role!, this.config.moderator.rolePerms[roleName]);
      }),
    );

    return role!;
  }

  private async assignRole(guildId: Snowflake, userId: Snowflake, roleName: ControlRoles) {
    const guild = this.bot.guilds.resolve(guildId)!;

    const [member, role] = await Promise.all([guild.members.fetch(userId), this.prepareRole(guild, roleName)]);
    if (!member) throw "Member not found";

    return member.roles.add(role);
  }

  async mute(guildId: Snowflake, userId: Snowflake, duration?: number) {
    const guildData = this.guildData.get(guildId);

    if (duration) duration = Math.max(this.config.moderator.minPunishmentDuration, duration);
    else if (guildData?.defDuration) duration = guildData.defDuration;

    let guildTimeouts = this.guildMutes.get(guildId);
    const timeout = guildTimeouts?.get(userId);
    if (timeout) clearTimeout(timeout);

    if (duration) {
      if (!guildTimeouts) this.guildMutes.set(guildId, (guildTimeouts = new Map()));
      guildTimeouts.set(
        userId,
        setTimeout(() => this.unmute(guildId, userId), duration),
      );
    }

    await Promise.all([
      this.assignRole(guildId, userId, "muted"),
      duration &&
        this.prisma.mutes.create({
          data: {
            end: new Date(Date.now() + duration),
            userId,
            guildId,
          },
        }),
    ]);
  }

  async unmute(guildId: Snowflake, userId: Snowflake) {
    const guildData = this.guildData.get(guildId);
    const guild = this.bot.guilds.resolve(guildId);
    if (!guild || !guildData || !guildData.mutedRoleId) return;

    const guildTimeouts = this.guildMutes.get(guildId);
    const timeout = guildTimeouts?.get(userId);
    if (guildTimeouts && timeout) {
      clearTimeout(timeout);
      guildTimeouts.delete(userId);
      // If no more mutes exist in guild, delete the map
      if (!guildTimeouts.size) this.guildMutes.delete(guildId);
    }

    await Promise.all([
      guild.members.fetch(userId).then((member) => member?.roles.remove(guildData.mutedRoleId!)),
      this.prisma.mutes.delete({ where: { guildId_userId: { guildId, userId } } }),
    ]);
  }
}
