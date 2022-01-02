export const replacements: Record<string, string> = {
  u: "you",
  ur: "you're",
};
export const replacementsRegex = RegExp("\\b" + Object.keys(replacements).join("|") + "\\b", "gi");
