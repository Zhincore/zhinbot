import { BotModule } from "@core/decorators";
import { ModeratorService } from "./ModeratorService";

@BotModule({ discordAdapters: [] })
export class AutoModModule {
  constructor(_service: ModeratorService) {
    /**/
  }
}
