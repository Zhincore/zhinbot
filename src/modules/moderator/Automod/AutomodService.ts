import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { AutomodSubmodule } from "./submodules/AutomodSubmodule";
import Submodules from "./submodules";

@Service()
export class AutomodService {
  // private readonly logger = this.bot.getLogger("Moderator");
  private readonly submodules: AutomodSubmodule[] = Submodules.map((s) => this.bot.container.get(s));

  constructor(private readonly bot: Bot) {
    bot.on("messageCreate", async (message) => {
      if (message.author.id === bot.user!.id) return;
      await Promise.all(this.submodules.map((s) => s.processMessage(message)));
    });
  }
}
