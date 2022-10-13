import "./prestart";
import "reflect-metadata";
import { addExitCallback } from "catch-exit";
import { bootstrap } from "./bootstrap";

async function main() {
  const { bot, config, logger } = await bootstrap();

  addExitCallback(() => {
    bot.destroy();
  });

  if (!process.env.DRY_RUN) {
    logger.debug("Logging into Discord...");

    await bot.login(config.auth.discordToken).catch((err) => console.error("Boot failed", err));
  } else {
    logger.debug("Running in dry mode, not logging in");
  }

  logger.debug("Done.");
}

main();
