import { build } from "esbuild";

await build({
	entryPoints: ["src/**/*.ts"],
	outdir: "dist",
	outbase: "src",
	platform: "node",
	format: "esm",
	target: "es2022", // to enable decorators (stage 3) this value cannot be esnext
	sourcemap: false,
	bundle: true, // important to enable this
	splitting: true, // important to enable this
	packages: "external", // important to enable this
});
