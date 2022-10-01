import * as chrono from "chrono-node";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { DiscordAdapter, DiscordSubcommand } from "@core/decorators";
import { BirthdaysService } from "./Birthdays.service";

@DiscordAdapter({
  supercomand: {
    name: "birthday",
    description: "Save your birthday or see birthdays of others",
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  },
})
export class BirthdaysDiscordAdapter {
  constructor(private readonly service: BirthdaysService) {}

  @DiscordSubcommand({
    description: "Save your birthday so we can notify everyone when it comes!",
    options: [
      {
        name: "date",
        description: "The date of your birthday. For example `16 Oct` or `16/10` or `16.10.` etc.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  })
  async set(interaction: ChatInputCommandInteraction) {
    const rawDate = interaction.options.getString("date", true);
    const date = chrono.parseDate(rawDate.replaceAll(".", "/").replace(/\/[$ ]/, ""));

    if (!date) {
      return interaction.reply({
        content: "Sorry, failed to parse the date. Try different format.",
        ephemeral: true,
      });
    }

    const result = await this.service.set(interaction.user.id, date);

    return interaction.reply({
      content: `Success! We will celebrate you on ${this.service.stringifyDate(result.date)}!`,
      ephemeral: true,
    });
  }

  @DiscordSubcommand({
    description: "Show birthday of yours or other member",
    options: [
      {
        name: "user",
        description: "The user to get birthday of. Yours by default.",
        type: ApplicationCommandOptionType.User,
      },
    ],
  })
  async get(interaction: ChatInputCommandInteraction) {
    let isSelf = false;
    let user = interaction.options.getUser("user", false);

    if (!user) {
      user = interaction.user;
      isSelf = true;
    }

    const username = user.username;
    const result = await this.service.get(user.id);

    if (!result) {
      return interaction.reply({
        content: isSelf ? "You haven't saved your birthday yet." : `${username} hasn't saved their birthday yet.`,
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: (isSelf ? "You have" : `${username} has`) + ` birthday on ${this.service.stringifyDate(result.date)}.`,
      ephemeral: true,
    });
  }

  @DiscordSubcommand({
    description: "Delete your birthday from the database",
  })
  async forget(interaction: ChatInputCommandInteraction) {
    const result = await this.service.forget(interaction.user.id);

    return interaction.reply({
      content: result.count ? "Successfully forgot your birthday." : "You haven't saved you birthday yet.",
      ephemeral: true,
    });
  }
}
