import { BotModule } from "@core/decorators";
import { AutomodService } from "./Automod.service";

@BotModule({ services: [AutomodService] })
export class AutomodSubModule {}
