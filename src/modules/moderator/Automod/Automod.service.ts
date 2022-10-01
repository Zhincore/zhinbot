import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { ModeratorService } from "~/modules/moderator/Moderator.service";
import { AutomodFilter } from "./filters/AutomodFilter";
import Filters from "./filters";

@Service()
export class AutomodService {
  // private readonly logger = this.bot.getLogger("Moderator");
  private readonly filters: AutomodFilter[] = Filters.map((filter) => this.bot.container.get(filter));

  constructor(private readonly bot: Bot, modservice: ModeratorService) {
    bot.on("messageCreate", async (message) => {
      if (!message.inGuild() || message.author.id === bot.user!.id) return;

      const config = await modservice.getGuildConfig(message.guildId);
      if (!config.automod) return;
      const disabledFilters = config.automodDisabledFilters as string[];

      await Promise.all(
        this.filters.map((filter) => !disabledFilters.includes(filter.name) && filter.processMessage(message)),
      );
    });
  }
}
