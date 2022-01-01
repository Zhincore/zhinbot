import { Message } from "discord.js";

export abstract class ModeratorSubmodule {
  abstract processMessage(message: Message): Promise<void>;
}
