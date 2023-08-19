import { EmbedBuilder, GuildTextBasedChannel } from "discord.js";
import { Service } from "typedi";
import { Config } from "~/Config/Config.js";

function getReactionEmoji(number: number) {
  if (number > 10 || number < 0) return "";
  if (number == 10) return "🔟";
  return number + "\uFE0F\u20E3";
}

@Service()
export class PollsService {
  constructor(private readonly config: Config) {}

  async sendPoll(channel: GuildTextBasedChannel, question: string, answers: string[], comment?: string) {
    if (!getReactionEmoji(answers.length - 1)) throw new Error("Too many answers");

    const message = await channel.send({
      content: comment,
      embeds: [
        new EmbedBuilder()
          .setTitle(question)
          .setColor(this.config.color)
          .setDescription(answers.map((v, i) => `${getReactionEmoji(i)} - ${v}`).join("\n")),
      ],
    });

    for (let i = 0; i < answers.length; i++) {
      await message.react(getReactionEmoji(i));
    }

    return message;
  }
}
