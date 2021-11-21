import { Service, Constructable } from "typedi";

const symbol = Symbol("moduleData");

export type BotModuleData<T> = {
  discordAdapter?: Constructable<T>;
};

export function BotModule(data: BotModuleData<any> = {}): ClassDecorator {
  const service = Service();
  return (target) => {
    Reflect.defineMetadata(symbol, data, target);
    service(target);
  };
}

export function getModuleData(target: any): BotModuleData<any> | undefined {
  return Reflect.getMetadata(symbol, target);
}
