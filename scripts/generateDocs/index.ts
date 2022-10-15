import "reflect-metadata";
import Path from "node:path";
import fs from "node:fs/promises";
import { getCommandMap } from "./getCommandMap";
import { getMarkdown } from "./getMarkdown";

const target = "docs/modules/";

async function main() {
  const commandMap = await getCommandMap();
  await fs.mkdir(target, { recursive: true });

  const promises: Promise<void>[] = [];
  for (const [module, commands] of commandMap.entries()) {
    const doc = getMarkdown(module, commands);
    promises.push(fs.writeFile(Path.join(target, module.name + ".md"), doc, "utf-8"));
    console.log(`Wrote '${module.name}' docs.`);
  }

  await Promise.all(promises);
  console.log("Done.");
  process.exit(0); // TODO: fix bot or modules keeping the eventloop alive
}

main().catch(console.error);
