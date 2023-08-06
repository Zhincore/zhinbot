import { EmbedBuilder, GuildTextBasedChannel } from "discord.js";
import { Service } from "typedi";
import { Config } from "~/Config/Config.js";

const answerEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

@Service()
export class PollsService {
  constructor(private readonly config: Config) {}

  async sendPoll(channel: GuildTextBasedChannel, question: string, answers: string[], comment?: string) {
    if (answers.length > answerEmojis.length) throw new Error("Too many answers");

    const message = await channel.send({
      content: comment,
      embeds: [
        new EmbedBuilder()
          .setTitle(question)
          .setColor(this.config.color)
          .setDescription(answers.map((v, i) => `${answerEmojis[i]} - ${v}`).join("\n")),
      ],
    });

    for (let i = 0; i < answers.length; i++) {
      await message.react(`${answerEmojis[i]}`);
    }

    return message;
  }
}
