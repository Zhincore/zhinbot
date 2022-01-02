import Discord, { Snowflake, CommandInteraction, ButtonInteraction, MessageOptions } from "discord.js";
import { Bot } from "@core/Bot";
import { DiscordAdapter, DiscordCommand, DiscordHandler } from "@core/decorators";
import { ModeratorService } from "./ModeratorService";

const WARNS_PAGE_ID = "warns";

@DiscordAdapter()
export class ModeratorWarnsDiscordAdapter {
  constructor(private readonly bot: Bot, private readonly service: ModeratorService) {}

  @DiscordCommand({
    description: "Warn a member",
    defaultPermission: false,
    options: [
      {
        name: "member",
        description: "The member to warn",
        type: "USER",
        required: true,
      },
      {
        name: "reason",
        description: "The reason for the warning",
        type: "STRING",
        required: true,
      },
    ],
  })
  async warn(interaction: CommandInteraction<"present">) {
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
    description: "Show warnings given to a member",
    defaultPermission: false,
    options: [
      {
        name: "member",
        description: "The member to show warnings of",
        type: "USER",
        required: true,
      },
      {
        name: "page",
        description: "Page of the warning list to show (first by default)",
        type: "NUMBER",
      },
    ],
  })
  async warns(interaction: CommandInteraction<"present">) {
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
  async warnsHandler(interaction: ButtonInteraction<"present">) {
    const [userId, page] = interaction.customId.split(":")[1].split(",");
    const message = await this.listWarns(interaction.guildId, userId, +page);
    return interaction.update(message);
  }

  private async listWarns(guildId: Snowflake, userId: Snowflake, page?: number | null): Promise<MessageOptions> {
    page = Math.max(0, (page ?? 1) - 1);
    const [user, [count, warns]] = await Promise.all([
      this.bot.users.fetch(userId),
      this.service.listWarns(guildId, userId, page * 25, 25),
    ]);

    const embed = new Discord.MessageEmbed({
      color: 0xfafa00,
      title: `List of warnings given to @${user.tag}`,
      description: `List of warnings given to <@${userId}>` + (warns.length ? "" : "\nNone given yet"),
      fields: warns.map((warn) => ({
        name: `#${warn.id} | <t:${(warn.timestamp.valueOf() + "").slice(0, -3)}>`,
        value: `<@${warn.staffId}>: "${warn.reason}"`,
      })),
      footer: { text: `Page ${page}/${Math.ceil(count / 25)}. ${count} warnings in total` },
    });

    const actionRow = new Discord.MessageActionRow({
      components: [
        new Discord.MessageButton({
          customId: `${WARNS_PAGE_ID}:${userId},${page - 1}`,
          label: "Prev page",
          emoji: "◀️",
          style: "SECONDARY",
          disabled: page == 0,
        }),
        new Discord.MessageButton({
          customId: `${WARNS_PAGE_ID}:${userId},${page + 1}`,
          label: "Next page",
          emoji: "▶️",
          style: "SECONDARY",
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
