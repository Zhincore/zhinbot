import { Interaction } from "discord.js";

export type IInteractionHandler<TInteraction extends Interaction> = {
  execute: (interaction: TInteraction) => any | Promise<any>;
};

export function pushToMetaArray(symbol: symbol, item: any, target: any) {
  let array = Reflect.getMetadata(symbol, target);
  if (!array) Reflect.defineMetadata(symbol, (array = []), target);
  array.push(item);
}