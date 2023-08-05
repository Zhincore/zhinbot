import { BotModule } from "@core/decorators/index.js";
import { ActivityService } from "./Activity.service.js";

@BotModule({ name: "activity", services: [ActivityService] })
export class ActivityModule {}
