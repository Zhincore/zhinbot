import { BotModule } from "@core/decorators";
import { TestModuleDiscordAdapter } from "./TestModule.discord";

@BotModule({ discordAdapter: TestModuleDiscordAdapter })
export class TestModule {
  ping() {
    return "Pong";
  }
}
