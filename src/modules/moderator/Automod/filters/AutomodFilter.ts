import { Message } from "discord.js";

export abstract class AutomodFilter {
  abstract readonly name: string;

  abstract processMessage(message: Message): Promise<void>;
}
