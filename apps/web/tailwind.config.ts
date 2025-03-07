import type { Config } from "tailwindcss";
import tailwindConfig from "@repo/tailwind";

const config: Pick<Config, "content" | "presets" | "theme"> = {
  content: ["./src/app/**/*.tsx"],
  presets: [tailwindConfig],
  theme: {
    extend: {},
  },
};

export default config;
