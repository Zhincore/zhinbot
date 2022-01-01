import "@tensorflow/tfjs-node";
import { Message } from "discord.js";
import { ToxicityClassifier } from "@tensorflow-models/toxicity";
import { Service } from "@core/decorators";
import { ModeratorSubmodule } from "../../ModeratorSubmodule";
import { replacements, replacementsRegex } from "./replacements";

const THRESHOLD = 0.8;

@Service()
export class ToxicityModeratorSubmodule extends ModeratorSubmodule {
  private readonly toxicity = new ToxicityClassifier(THRESHOLD, [
    "identity_attack",
    "insult",
    "severe_toxicity",
    "sexual_explicit",
    "threat",
    "toxicity",
  ]);
  private loaded = false;

  constructor() {
    super();
    this.toxicity.load().then(() => (this.loaded = true));
  }

  async processMessage(message: Message) {
    if (!this.loaded) return;

    const prediction = await this.toxicity.classify(
      message.content.replace(replacementsRegex, (match) => replacements[match]),
    );
    const output = [];

    for (const item of prediction) {
      const [result] = item.results;
      if (!result.match) continue;
      output.push(item.label + ` ${result.probabilities[1] - result.probabilities[0]}`);
    }

    if (output.length) await message.channel.send(output.join(", "));
  }
}
