import Discord, { BaseInteraction } from "discord.js";
import { Bot } from "~/core/Bot";
import { Optional, Replace } from "~/utils";

export type IInteractionHandler<TInteraction extends BaseInteraction> = {
  execute: (interaction: TInteraction) => any | Promise<any>;
};

export type AnnotWithBot<T> = ((bot: Bot) => T) | T;
export type RemoveTranslated<T> = Optional<T, "description">;
export type ReplaceOptions<T, Opts> = Replace<T, { options?: Opts }>;

export type CustomCommandOptionData = RemoveTranslated<
  Omit<
    Exclude<
      Discord.ApplicationCommandOptionData,
      Discord.ApplicationCommandSubCommandData | Discord.ApplicationCommandSubGroupData
    >,
    "autocomplete"
  >
> & {
  /**
   * Id of the autocompleter
   */
  autocomplete?: string | false;
  required?: boolean;
  choices?: Discord.ApplicationCommandChoicesData["choices"];
  channel_types?: Discord.ApplicationCommandChannelOptionData["channel_types"];
};

export type CustomCommandData = ReplaceOptions<
  Discord.ApplicationCommandData,
  CustomCommandOptionData[] | CustomSubData[]
>;
export type CustomSubData = CustomSubCommandData | CustomSubGroupData;
export type CustomSubCommandData = ReplaceOptions<
  RemoveTranslated<Discord.ApplicationCommandSubCommandData>,
  CustomCommandOptionData[]
>;
export type CustomSubGroupData = ReplaceOptions<
  RemoveTranslated<Discord.ApplicationCommandSubGroupData>,
  CustomSubCommandData[]
>;

export function pushToMetaArray(symbol: symbol, item: any, target: any) {
  let array = Reflect.getMetadata(symbol, target);
  if (!array) Reflect.defineMetadata(symbol, (array = []), target);
  array.push(item);
}
