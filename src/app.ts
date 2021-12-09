import "reflect-metadata";
import { config as dotenv } from "dotenv";
import { Bot } from "@core/Bot";
import { Config } from "./Config";
import modules from "./modules";

dotenv();

async function main() {
  const config = new Config();
  const bot: Bot = new Bot(config);
  bot.container.set(Config, config);
  bot.modules.register(modules);

  process.on("exit", () => {
    bot.destroy();
  });

  await bot.login(config.auth.discord.token).catch((err) => console.error("Boot failed", err));
}

main();
