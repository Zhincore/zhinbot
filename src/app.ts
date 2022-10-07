import "./prestart";
import "reflect-metadata";
import { addExitCallback } from "catch-exit";
import { Bot } from "@core/Bot";
import { Config } from "./Config";
import modules from "./modules";

async function main() {
  console.log("Loading configuration...");
  const config = new Config();
  await config.load();

  console.log("Initializing...");
  const bot: Bot = new Bot({ ...config.system, defaultLocale: config.defaultLocale });
  const logger = bot.getLogger("Bootstrap");
  bot.container.set(Config, config);

  logger.debug("Loading translations...");
  await bot.loadTranslations();

  logger.debug("Loading modules...");
  bot.modules.register(modules);

  logger.debug("Logging into Discord...");
  addExitCallback(() => {
    bot.destroy();
  });
  await bot.login(config.auth.discordToken).catch((err) => console.error("Boot failed", err));

  logger.debug("Done.");
}

main();
