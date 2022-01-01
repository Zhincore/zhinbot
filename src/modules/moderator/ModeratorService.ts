import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { ModeratorSubmodule } from "./ModeratorSubmodule";
import Submodules from "./submodules";

@Service()
export class ModeratorService {
  private readonly playerLogger = this.bot.getLogger("Moderator");
  private readonly submodules: ModeratorSubmodule[] = Submodules.map((s) => this.bot.container.get(s));

  constructor(private readonly bot: Bot) {
    bot.on("messageCreate", async (message) => {
      if (message.author.id === bot.user!.id) return;
      await Promise.all(this.submodules.map((s) => s.processMessage(message)));
    });
  }
}

export type ModeratorResolution = any;
