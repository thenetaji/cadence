import { View } from 'react-native';

const STEPS = 8;
const WIDTH = 32;

/** Trailing fade into `color` over a horizontally scrolling row: a cut-off chip reads as "scrolls". */
function EdgeFade({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: WIDTH, flexDirection: 'row' }}>
      {Array.from({ length: STEPS }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: color, opacity: (i + 1) / STEPS }} />
      ))}
    </View>
  );
}

export { EdgeFade };
