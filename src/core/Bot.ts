import { Client } from "discord.js";
import { getModuleData } from "./decorators";

export class Bot extends Client {
  readonly isDev = process.env.NODE_ENV !== "production";

  constructor() {
    super({
      presence: { activities: [] },
      intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_VOICE_STATES"],
    });

    if (this.isDev) this.on("debug", console.log);
    this.on("warn", console.warn);
    this.on("error", console.error);

    this.once("ready", () => {
      console.log("Logged in as %s", this.user!.tag);
    });
  }

  registerModules(modules: any[]) {
    for (const botModule of modules) {
      const moduleData = getModuleData(botModule);
      if (!moduleData) console.error(botModule.name + " is missing the BotModule decorator");
    }
  }

  destroy() {
    console.log("Logging out...");
    super.destroy();
  }

  async login(token?: string) {
    await super.login(token);

    return "";
  }
}
