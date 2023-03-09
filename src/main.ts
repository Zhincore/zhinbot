import "./prestart.js";
import "reflect-metadata";
import exitHook from "exit-hook";
import { APIGuildMembershipScreening, RESTGetAPIGuildMemberVerificationResult, Routes } from "discord.js";
import { bootstrap } from "./bootstrap.js";

async function main() {
  const { bot, config, logger } = await bootstrap();

  exitHook(() => {
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
