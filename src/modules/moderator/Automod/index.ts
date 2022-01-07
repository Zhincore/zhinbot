import { BotModule } from "@core/decorators";
import { AutomodService } from "./AutomodService";

@BotModule({ services: [AutomodService] })
export class AutomodSubModule {}
