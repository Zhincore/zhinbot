import { CommandInteraction } from "discord.js";
import { InviteTargetType } from "discord-api-types/v10";
import { Bot } from "@core/Bot";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";
import { Config } from "~/Config";

const { activityMap } = new Config().activities;

@DiscordAdapter()
export class ActivitiesDiscordAdapter {
  constructor(private readonly bot: Bot) {}

  @DiscordCommand({
    description: "Start an activity",
    options: [
      {
        name: "activity",
        description: "The activity to start",
        type: "STRING",
        required: true,
        choices: Object.entries(activityMap).map(([name, value]) => ({ name, value })),
      },
      {
        name: "channel",
        description: "Voice channel to start activity in",
        type: "CHANNEL",
      },
    ],
  })
  async activity(interaction: CommandInteraction<"present">) {
    const author = await this.bot.fetchMember(interaction.guildId, interaction.user.id);
    const channel = interaction.options.getChannel("channel", false) ?? author?.voice.channel;

    if (!channel || channel.type !== "GUILD_VOICE") throw new Error("You must be in or specify a voice channel.");

    const invite = await channel.createInvite({
      maxAge: 0,
      targetType: InviteTargetType.EmbeddedApplication as any,
      targetApplication: interaction.options.getString("activity", true),
    });

    return interaction.reply(`Started '${invite.targetApplication!.name}': ${invite.url}`);
  }
}
