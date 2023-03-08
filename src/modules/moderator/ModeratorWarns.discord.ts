import Discord, {
  Snowflake,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  ButtonStyle,
} from "discord.js";
import { Bot } from "@core/Bot/index.js";
import { DiscordAdapter, DiscordCommand, DiscordHandler } from "@core/decorators/index.js";
import { ModeratorService } from "./Moderator.service.js";

const WARNS_PAGE_ID = "warns";

@DiscordAdapter()
export class ModeratorWarnsDiscordAdapter {
  constructor(private readonly bot: Bot, private readonly service: ModeratorService) {}

  @DiscordCommand({
    options: [
      {
        name: "member",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  })
  async warn(interaction: ChatInputCommandInteraction<"cached">) {
    await interaction.deferReply({ ephemeral: true });
    const id = await this.service.warn(
      {
        userId: interaction.options.getUser("member", true).id,
        reason: interaction.options.getString("reason", true),
        guildId: interaction.guildId,
        staffId: interaction.user.id,
      },
      interaction.channelId,
    );

    return interaction.editReply(
      id
        ? `Successfully warned a member. ID of the warning is \`${id}\`.`
        : "Member not found, but warn has been recorded anyway",
    );
  }

  @DiscordCommand({
    options: [
      {
        name: "member",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "page",
        type: ApplicationCommandOptionType.Integer,
      },
    ],
  })
  async warns(interaction: ChatInputCommandInteraction<"cached">) {
    const message = await this.listWarns(
      interaction.guildId,
      interaction.options.getUser("member", true).id,
      interaction.options.getInteger("page", false),
    );
    return interaction.reply({
      ...message,
      ephemeral: true,
    });
  }

  @DiscordHandler(WARNS_PAGE_ID)
  async warnsHandler(interaction: ButtonInteraction<"cached">) {
    const [userId, page] = interaction.customId.split(":")[1].split(",");
    const message = await this.listWarns(interaction.guildId, userId, +page);
    return interaction.update(message);
  }

  private async listWarns(guildId: Snowflake, userId: Snowflake, page?: number | null) {
    page = Math.max(0, (page ?? 1) - 1);
    const [user, [count, warns]] = await Promise.all([
      this.bot.users.fetch(userId),
      this.service.listWarns(guildId, userId, page * 25, 25),
    ]);

    const embed = new Discord.EmbedBuilder({
      color: 0xfafa00,
      title: `List of warnings given to @${user.tag}`,
      description: `List of warnings given to <@${userId}>` + (warns.length ? "" : "\nNone given yet"),
      fields: warns.map((warn) => ({
        name: `#${warn.id} | <t:${(warn.timestamp.valueOf() + "").slice(0, -3)}>`,
        value: `<@${warn.staffId}>: "${warn.reason}"`,
      })),
      footer: { text: `Page ${page}/${Math.ceil(count / 25)}. ${count} warnings in total` },
    });

    const actionRow = new Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>({
      components: [
        new Discord.ButtonBuilder({
          customId: `${WARNS_PAGE_ID}:${userId},${page - 1}`,
          label: "Prev page",
          emoji: "◀️",
          style: ButtonStyle.Secondary,
          disabled: page == 0,
        }),
        new Discord.ButtonBuilder({
          customId: `${WARNS_PAGE_ID}:${userId},${page + 1}`,
          label: "Next page",
          emoji: "▶️",
          style: ButtonStyle.Secondary,
          disabled: page + 1 >= count / 25,
        }),
      ],
    });

    return {
      embeds: [embed],
      components: [actionRow],
    };
  }
}
