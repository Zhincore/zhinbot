import {
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  GuildTextBasedChannel,
  PermissionFlagsBits,
} from "discord.js";
import { DiscordAdapter, DiscordCommand } from "@core/index.js";
import { PollsService } from "./Polls.service.js";

@DiscordAdapter()
export class PollsDiscordAdapter {
  constructor(private readonly service: PollsService) {}

  @DiscordCommand({
    options: [
      {
        name: "question",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "answers",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "channel",
        type: ApplicationCommandOptionType.Channel,
        channelType: [ChannelType.GuildText],
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
  })
  async poll(interaction: ChatInputCommandInteraction<"cached">) {
    const channel =
      interaction.options.getChannel<ChannelType.GuildText>("channel", false) ??
      (interaction.channel as GuildTextBasedChannel);
    const question = interaction.options.getString("question", true);
    const answers = interaction.options
      .getString("answers", true)
      .split(";")
      .map((v) => v.trim())
      .filter((v) => v);

    await this.service.sendPoll(channel, question, answers);
    return interaction.reply({
      ephemeral: true,
      content: "Poll sent",
    });
  }
}
