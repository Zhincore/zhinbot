import { BaseInteraction } from "discord.js";
import { Bot } from "~/core/Bot";

export type IInteractionHandler<TInteraction extends BaseInteraction> = {
  execute: (interaction: TInteraction) => any | Promise<any>;
};

export type AnnotWithBot<T> = ((bot: Bot) => T) | T;

export function pushToMetaArray(symbol: symbol, item: any, target: any) {
  let array = Reflect.getMetadata(symbol, target);
  if (!array) Reflect.defineMetadata(symbol, (array = []), target);
  array.push(item);
}
