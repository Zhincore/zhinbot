import Discord, { BaseInteraction } from "discord.js";
import { Bot } from "@core/Bot/index.js";
import { Optional, Replace } from "@core/utils";
import { TranslateFn } from "~/core/Translation.service.js";

export type IInteractionHandler<TInteraction extends BaseInteraction> = {
  execute: (interaction: TInteraction, translate: TranslateFn) => any | Promise<any>;
};

export type AnnotWithBot<T> = ((bot: Bot) => T) | T;
export type RemoveTranslated<T extends Record<string, any>> = Optional<T, "description">;
export type ReplaceOptions<T, Opts> = Replace<T, { options?: Opts }>;
export type ToCustomData<T extends Record<string, any>, Opts> = ReplaceOptions<RemoveTranslated<T>, Opts>;

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

export type CustomCommandData = ToCustomData<
  Discord.ApplicationCommandData,
  CustomCommandOptionData[] | CustomSubData[]
>;
export type CustomSubData = CustomSubCommandData | CustomSubGroupData;
export type CustomSubCommandData = ToCustomData<Discord.ApplicationCommandSubCommandData, CustomCommandOptionData[]>;
export type CustomSubGroupData = ToCustomData<Discord.ApplicationCommandSubGroupData, CustomSubCommandData[]>;

export function pushToMetaArray(symbol: symbol, item: any, target: any) {
  let array = Reflect.getMetadata(symbol, target);
  if (!array) {
    array = [];
    Reflect.defineMetadata(symbol, array, target);
  }
  array.push(item);
}
