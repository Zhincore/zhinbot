import {
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { DiscordAdapter, DiscordSubcommand } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Config } from "~/Config";
import { BirthdaysService } from "./Birthdays.service";

@DiscordAdapter({
  supercomand: {
    name: "birthdayconf",
  },
})
export class BirthdaysConfigDiscordAdapter {
  constructor(private readonly service: BirthdaysService, private readonly bot: Bot, private readonly config: Config) {}

  @DiscordSubcommand({
    type: ApplicationCommandOptionType.SubcommandGroup,
    options: [
      {
        name: "time",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "time",
            type: ApplicationCommandOptionType.String,
          },
        ],
      },
      {
        name: "channel",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
          },
        ],
      },
      {
        name: "ping",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "ping",
            type: ApplicationCommandOptionType.Role,
          },
        ],
      },
    ],
  })
  async set(interaction: ChatInputCommandInteraction<"cached">) {
    const property = interaction.options.getSubcommand(true);
    const value = interaction.options.get(property, true);

    let _value: any;
    switch (property) {
      case "time":
        _value = value.value;
        break;
      case "channel":
        _value = value.channel!.id;
        break;
      case "ping":
        _value = value.role!.id;
        break;
    }

    const result = await this.service.updateAlertSettings(interaction.guildId, { [property]: _value });
    let note = "";

    if (!result.bdayAlertChannel || !result.bdayAlertTime) {
      note = `You have specified ${result.bdayAlertChannel ? "alert channel" : "alert time"} but not ${
        result.bdayAlertChannel ? "alert time" : "alert channel"
      }. Your guild won't recieve alerts until you specify it.`;
    }

    return interaction.reply({
      content: "Settings updated." + (note ? " Note: " + note : ""),
      ephemeral: true,
    });
  }
  @DiscordSubcommand({})
  async show(interaction: ChatInputCommandInteraction<"cached">) {
    const settings = await this.service.getAlertSettings(interaction.guildId);

    return interaction.reply({
      embeds: [
        new EmbedBuilder({
          color: this.config.color,
          title: "Current birthday module settings",
          fields: [
            {
              name: "Time",
              value: settings?.bdayAlertTime || "none",
              inline: true,
            },
            {
              name: "Channel",
              value: (await this.bot.fetchChannel<TextChannel>(settings?.bdayAlertChannel))?.toString() || "none",
              inline: true,
            },
            {
              name: "Ping",
              value:
                (settings?.bdayAlertPing &&
                  (await interaction.guild.roles.fetch(settings.bdayAlertPing))?.toString()) ||
                "none",
              inline: true,
            },
          ],
        }),
      ],
      ephemeral: true,
    });
  }
}
