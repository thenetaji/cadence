// Light entry: the Skia loader and the pure chart maths. Importing this never evaluates Skia, which on web must
// first be evaluated after CanvasKit has loaded (see `withSkia`). The chart components are the separate
// `@studio/charts/components` entry; load them lazily through `withSkia(() => import('@studio/charts/components')...)`.
export * from "./components/with-skia";
export * from "./lib";
