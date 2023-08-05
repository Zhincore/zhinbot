import { Service } from "@core/decorators/index.js";
import { Bot } from "@core/Bot/index.js";
import { ModeratorService } from "~/modules/moderator/Moderator.service.js";
import { AutomodFilter } from "./filters/AutomodFilter.js";
import Filters from "./filters/index.js";

@Service()
export class AutomodService {
  // private readonly logger = this.bot.getLogger("Moderator");
  private readonly filters: AutomodFilter[] = Filters.map((filter) => this.bot.container.get(filter));

  constructor(
    private readonly bot: Bot,
    modservice: ModeratorService,
  ) {
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
