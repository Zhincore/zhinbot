import "~/prestart";
import { ApplicationCommandData } from "discord.js";
import { bootstrap } from "~/bootstrap";

export async function getCommandMap() {
  const { bot } = await bootstrap();

  const commandMap = new Map<string, ApplicationCommandData[]>();
  for (const command of bot.modules.getCommands()) {
    let list = commandMap.get(command.moduleName);
    if (!list) commandMap.set(command.moduleName, (list = []));
    list.push(command.commandData);
  }

  return commandMap;
}
