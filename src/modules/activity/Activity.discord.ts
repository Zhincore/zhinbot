import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import ms from "ms";
import { DiscordAdapter, DiscordSubcommand, type TranslateFn } from "~/core/index.js";
import { ActivityService } from "./Activity.service.js";

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

    const result = ms(await this.service.getActivity(interaction.guildId, member.id, from, to));
    const parsedResult = /^(\d+)(\w+)$/.exec(result)!;
    const value = parsedResult[1];
    const unit = parsedResult[2];

    return interaction.reply({
      content: t("activity-report-today", {
        subject: member.id == interaction.member.id ? "you" : member.toString(),
        time: t("time-unit-" + unit, { value }),
      }),
      ephemeral: true,
    });
  }
}
