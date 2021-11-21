import "reflect-metadata";
import { config as dotenv } from "dotenv";
import { Bot } from "@core/Bot";
import { Config } from "./Config";
import modules from "./modules";

dotenv();

async function main() {
  const bot: Bot = new Bot();
  const config = bot.container.get(Config);
  bot.owners = config.owners;
  bot.modules.register(modules);

  const killHandler = () => {
    bot.destroy();
    process.exit(1);
  };

  bot.once("ready", () => {
    console.log("Ready");
    process.on("SIGINT", killHandler);
    process.on("SIGTERM", killHandler);
  });

  await bot.login(config.auth.discord.token).catch((err) => console.error("Boot failed", err));
}

main();
