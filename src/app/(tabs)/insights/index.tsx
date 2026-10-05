import { withSkia } from '@/components/charts/with-skia';

// Skia charts load lazily; on web CanvasKit is fetched first (see with-skia.web.tsx).
export default withSkia(() => import('@/features/insights/insights-screen'));
