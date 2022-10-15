import "~/prestart";
import { ApplicationCommandData } from "discord.js";
import { bootstrap } from "~/bootstrap";
import { IBotModule } from "~/core";

export async function getCommandMap() {
  const { bot } = await bootstrap();

  const commandMap = new Map<IBotModule<any>, ApplicationCommandData[]>();
  for (const command of bot.modules.getCommands()) {
    let list = commandMap.get(command.moduleData);
    if (!list) commandMap.set(command.moduleData, (list = []));
    list.push(command.commandData);
  }

  return commandMap;
}
