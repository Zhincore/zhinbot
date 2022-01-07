import "@tensorflow/tfjs-node";
import { Message } from "discord.js";
import { ToxicityClassifier } from "@tensorflow-models/toxicity";
import { Service } from "@core/decorators";
import { Config } from "~/Config";
import { ModeratorService } from "~/modules/moderator/ModeratorService";
import { AutomodFilter } from "../AutomodFilter";
import { replacements, replacementsRegex } from "./replacements";

@Service()
export class ToxicityAutomodFilter extends AutomodFilter {
  public readonly name = "toxicity";
  private readonly config = this.globalConfig.moderation.automod.toxicity;
  private readonly toxicity = new ToxicityClassifier(this.config.detectThreshold, [
    "identity_attack",
    "insult",
    "severe_toxicity",
    "sexual_explicit",
    "threat",
    "toxicity",
  ]);
  private loaded = false;

  constructor(private readonly service: ModeratorService, private readonly globalConfig: Config) {
    super();
    this.toxicity.load().then(() => (this.loaded = true));
  }

  async processMessage(message: Message<true>) {
    if (!this.loaded) return;

    const prediction = await this.toxicity.classify(
      message.content.replace(replacementsRegex, (match) => replacements[match]),
    );

    const warns: typeof this.config.warn = {};
    let shouldDelete = false;
    let toxicity = 0;

    for (const item of prediction) {
      const [result] = item.results;
      if (!result.match) continue;

      const score = (result.probabilities[1] - this.config.detectThreshold) / (1 - this.config.detectThreshold);
      const warnConf = this.config.warn[item.label];

      if (warnConf) {
        warns[item.label] = warnConf;
        if (score > this.config.scoreDeleteThreshold) shouldDelete = true;
      } else if (item.label == "toxicity") {
        toxicity = score;
      }
    }

    const toxic = toxicity > this.config.scoreDeleteThreshold;
    const deleted = toxic && shouldDelete && message.deletable;
    const promises: Promise<any>[] = [];

    if (deleted) promises.push(message.delete());

    promises.push(...this.applyWarns(message, warns, toxic, deleted));

    await Promise.all(promises);
  }

  private applyWarns(message: Message<true>, warns: typeof this.config.warn, toxic: boolean, deleted: boolean) {
    return Object.entries(warns).map(async ([problem, warnConf]) => {
      if (warnConf.mustBeToxic && !toxic) return;

      const an = problem.startsWith("i") ? "an" : "a";
      return this.service.warn(
        {
          guildId: message.guildId,
          userId: message.author.id,
          staffId: message.client.user!.id,
          reason: [
            `Sent a message possibly containing ${an} ${problem.replace("_", " ")}.`,
            deleted && "The message has been deleted.",
          ]
            .filter((v) => v)
            .join(" "),
        },
        message.channelId,
      );
    });
  }
}
