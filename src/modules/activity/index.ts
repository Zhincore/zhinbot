import { BotModule } from "@core/decorators/index.js";
import { ActivityTrackerService } from "./ActivityTracker.service.js";
import { ActivityDiscordAdapter } from "./Activity.discord.js";

@BotModule({
  name: "activity",
  services: [ActivityTrackerService],
  discordAdapters: [ActivityDiscordAdapter],
})
export class ActivityModule {}
