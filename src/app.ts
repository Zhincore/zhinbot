import "reflect-metadata";
import { config as dotenv } from "dotenv";
import { Bot } from "@core";
import { Config } from "./Config";
import { TestModule } from "./modules/TestModule";

dotenv();

async function main() {
  const config = new Config();
  const bot: Bot = module.hot?.data?.bot ?? new Bot();
  bot.registerModules([TestModule]);

  const killHandler = () => {
    bot.destroy();
    process.exit(1);
  };

  bot.once("ready", () => {
    console.log("Ready");
    process.on("SIGINT", killHandler);
    process.on("SIGTERM", killHandler);
  });

  if (!bot.isReady()) await bot.login(config.auth.discord.token).catch((err) => console.error("Boot failed", err));

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose((data) => {
      data.bot = bot;
    });
  }
}

main();
