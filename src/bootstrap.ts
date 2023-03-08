import type { TemplatedApp } from "uWebSockets.js";
import { Bot } from "@core/Bot/index.js";
import { Config } from "./Config/index.js";
import modules from "./modules/index.js";

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

  let ws: TemplatedApp | undefined;
  if (config.apiPort) {
    logger.debug("Loading API server...");
    const { App } = await import("uWebSockets.js");
    logger.debug("Starting API server...");
    ws = App()
      .ws("/*", {
        idleTimeout: 60,
        /* For brevity we skip the other events (upgrade, open, ping, pong, close) */
        message: (ws, message, isBinary) => {
          /* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */

          /* Here we echo the message back, using compression if available */
          const ok = ws.send("server: " + Buffer.from(message).toString("utf-8"), isBinary, true);
        },
      })
      .listen(config.apiPort, (listenSocket) => {
        if (listenSocket) logger.info("Listening on port " + config.apiPort);
        else logger.warn("API server didn't return listening socket.");
      });
  }

  return { bot, ws, config, logger };
}
