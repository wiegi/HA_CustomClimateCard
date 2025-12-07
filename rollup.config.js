import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const production = process.env.NODE_ENV === "production";

export default {
  input: "src/RoomClimateCard.ts",
  output: {
    file: "dist/room-climate-card.js",
    format: "es",
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    production && terser(),
  ].filter(Boolean),
};
