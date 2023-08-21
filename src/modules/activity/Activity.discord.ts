import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import ms from "ms";
import { DiscordAdapter, DiscordSubcommand, type TranslateFn } from "~/core/index.js";
import { ActivityService } from "./Activity.service.js";
import { translateTime } from "~/utils/index.js";

@DiscordAdapter({
  supercomand: {
    name: "activity",
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  },
})
export class ActivityDiscordAdapter {
  constructor(private readonly service: ActivityService) {}

  @DiscordSubcommand({
    options: [
      {
        name: "member",
        type: ApplicationCommandOptionType.User,
      },
    ],
  })
  async today(interaction: ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const member = interaction.options.getUser("member", false) ?? interaction.member;

    const day = ms("1d");
    const from = new Date(Math.trunc(Date.now() / day) * day);
    const to = new Date(+from + day);

    const result = await this.service.getActivity(interaction.guildId, member.id, from, to);

    return interaction.reply({
      content: t("activity-report-today", {
        subject: member.id == interaction.member.id ? "you" : member.toString(),
        time: translateTime(result, t),
      }),
      ephemeral: true,
    });
  }

  @DiscordSubcommand({})
  async leaderboard(interaction: ChatInputCommandInteraction<"cached">, t: TranslateFn) {
    const leaderboard = await this.service.getLeaderboard(interaction.guildId);

    let content = t("activity-leaderboard-title") + "\n\n";

    for (let i = 0; i < leaderboard.length; i++) {
      const row = leaderboard[i];
      const member = await interaction.guild.members.fetch(row.userId);

      content += `${i + 1}. ${member.displayName} (${member.user.tag}) - ${translateTime(row.activity, t)}\n`;
    }

    return interaction.reply(content);
  }
}
