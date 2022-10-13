import textTable from "text-table";

export type Replace<T, P> = Omit<T, keyof P> & P;
export type Optional<T, Key extends keyof T> = Replace<T, { [x in Key]?: T[x] }>;

export function table(result: Record<string, any>[]) {
  return result && result.length
    ? "```\n" +
        textTable([
          Object.keys(result[0]).map((col) => col[0].toUpperCase() + col.slice(1)),
          ...result.map((item: Record<string, any>) => Object.values(item).map((col) => col ?? "-")),
        ]) +
        "```"
    : "There are no items to show.";
}
