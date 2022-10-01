import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { DiscordAdapter, DiscordCommand } from "@core/decorators";
import { MessageRatingService } from "./MessageRating.service";

@DiscordAdapter()
export class MessageRatingDiscordAdapter {
  constructor(private readonly service: MessageRatingService) {}

  async doRating(interaction: MessageContextMenuCommandInteraction<"cached">, isLike: boolean) {
    const author = interaction.targetMessage.author;
    if (author.bot) throw new Error("Cannot rate bot message");
    await this.service.rate(interaction.guildId, author.id, isLike ? 1 : -1);
    return interaction.reply({
      content: `You've ${isLike ? "liked" : "disliked"} this message`,
      ephemeral: true,
    });
  }

  @DiscordCommand(() => ({
    name: "Like message",
    type: ApplicationCommandType.Message,
    defaultMemberPermissions: PermissionFlagsBits.AddReactions,
  }))
  like(interaction: MessageContextMenuCommandInteraction<"cached">) {
    return this.doRating(interaction, true);
  }

  @DiscordCommand(() => ({
    name: "Dislike message",
    type: ApplicationCommandType.Message,
    defaultMemberPermissions: PermissionFlagsBits.AddReactions,
  }))
  dislike(interaction: MessageContextMenuCommandInteraction<"cached">) {
    return this.doRating(interaction, false);
  }

  @DiscordCommand(() => ({
    description: "Show rating of a member",
    options: [
      {
        name: "member",
        description: "The member to show rating of (you if not specified)",
        type: ApplicationCommandOptionType.User,
      },
    ],
  }))
  async rating(interaction: ChatInputCommandInteraction<"cached">) {
    const user = interaction.options.getUser("member", false) ?? interaction.user;
    const rating = await this.service.getRating(interaction.guildId, user.id);
    return interaction.reply(`${user.tag} has rating of \`${rating}\`.`);
  }
}
