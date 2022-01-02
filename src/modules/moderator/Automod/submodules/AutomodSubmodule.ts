import { Message } from "discord.js";

export abstract class AutomodSubmodule {
  abstract processMessage(message: Message): Promise<void>;
}
