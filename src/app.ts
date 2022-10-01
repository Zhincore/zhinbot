import "./prestart";
import "reflect-metadata";
import { addExitCallback } from "catch-exit";
import { Bot } from "@core/Bot";
import { Config } from "./Config";
import modules from "./modules";

async function main() {
  const config = new Config();
  const bot: Bot = new Bot(config);

  await bot.loadTranslations();
  bot.container.set(Config, config);
  bot.modules.register(modules);

  addExitCallback(() => {
    bot.destroy();
  });

  await bot.login(config.auth.discord.token).catch((err) => console.error("Boot failed", err));
}

main();
