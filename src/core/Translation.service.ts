import fs from "node:fs/promises";
import Path from "node:path";
import { FluentBundle, FluentResource, FluentVariable } from "@fluent/bundle";
import { Service } from "./decorators";
import { getLogger } from "./Bot/getLogger";

@Service()
export class TranslationService {
  private readonly logger = getLogger("Translations");
  private readonly localeBoundles = new Map<string, FluentBundle>();

  async load() {
    for (const error of await this.loadFolder("./translations")) {
      this.logger.warn(error);
    }
    for (const error of await this.loadFolder("./translations/overrides", true)) {
      this.logger.warn(new Error("Override failed", { cause: error }));
    }
  }

  private async loadFolder(path: string, override = false) {
    const promises: Promise<Error[]>[] = [];

    for await (const dirent of await fs.opendir(path)) {
      if (!dirent.isFile() || !dirent.name.endsWith(".ftl")) continue;

      const locale = dirent.name.substring(0, -".ftl".length);

      promises.push(
        fs.readFile(Path.join(path, dirent.name), "utf-8").then((f) => {
          let bundle = this.localeBoundles.get(locale);
          if (!bundle) {
            bundle = new FluentBundle(locale);
            this.localeBoundles.set(locale, bundle);
          }
          return bundle.addResource(new FluentResource(f), { allowOverrides: override });
        }),
      );
    }

    return (await Promise.all(promises)).flat();
  }

  getLocales() {
    return Array.from(this.localeBoundles.keys());
  }

  translate(pattern: string, args?: Record<string, FluentVariable>, locale = "en") {
    const bundle = this.localeBoundles.get(locale);
    if (!bundle) throw new Error(`Requested locale '${locale}' is not loaded`);

    const message = bundle.getMessage(pattern);
    if (!message?.value) throw new Error(`Requested pattern '${pattern}' is not loaded`);

    return bundle.formatPattern(message.value, args);
  }
}
