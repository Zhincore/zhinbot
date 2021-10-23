const moduleDataSymbol = Symbol("moduleData");

export type ModuleData = {
  discordController?: void;
};

export function BotModule(moduleData: ModuleData = {}): ClassDecorator {
  return (target) => Reflect.defineMetadata(moduleDataSymbol, moduleData, target);
}

export function getModuleData(target: any): ModuleData | undefined {
  return Reflect.getMetadata(moduleDataSymbol, target);
}
