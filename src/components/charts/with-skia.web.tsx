import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { ComponentType } from 'react';

/** Web: load CanvasKit (`public/canvaskit.wasm`) before the chart module is evaluated. */
export function withSkia<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  function Wrapped(props: P) {
    return (
      <WithSkiaWeb
        getComponent={load as () => Promise<{ default: ComponentType<object> }>}
        componentProps={props as object}
        opts={{ locateFile: (file: string) => `/${file}` }}
        fallback={null}
      />
    );
  }
  return Wrapped;
}
