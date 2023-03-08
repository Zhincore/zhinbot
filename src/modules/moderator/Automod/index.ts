import { BotModule } from "@core/decorators/index.js";
import { AutomodService } from "./Automod.service.js";

@BotModule({ services: [AutomodService] })
export class AutomodSubModule {}
