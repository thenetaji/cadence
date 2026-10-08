import { lazy, Suspense, type ComponentType } from "react";

/**
 * Native: Skia is ready at startup, so this is a plain lazy import (keeps chart code out of the
 * initial require graph). Web uses `with-skia.web.tsx`, which loads CanvasKit first.
 */
export function withSkia<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const Lazy = lazy(load);
  function Wrapped(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...(props as P & React.JSX.IntrinsicAttributes)} />
      </Suspense>
    );
  }
  return Wrapped;
}
