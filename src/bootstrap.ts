import { Bot } from "@core/Bot";
import { Config } from "./Config";
import modules from "./modules";

export async function bootstrap() {
  console.log("Loading configuration...");
  const config = new Config();
  await config.load();

  console.log("Initializing...");
  const bot = new Bot({ ...config.system, defaultLocale: config.defaultLocale });
  const logger = bot.getLogger("Bootstrap");
  bot.container.set(Config, config);

  logger.debug("Loading translations...");
  await bot.loadTranslations();

  logger.debug("Loading modules...");
  bot.modules.register(modules);

  return { bot, config, logger };
}
