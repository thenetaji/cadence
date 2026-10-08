import { StyleSheet, View } from "react-native";

import {
  AppIcon,
  clear,
  gradientStyle,
  useIconPrefs,
  tileRadius,
  tileSpec,
} from "@studio/icons";
import type { IconBackground, IconStyle } from "@studio/icons";
import type { CategoryColorKey } from "@studio/theme";
import { useTokens } from "@studio/theme";

type IconTileProps = {
  /** Concept id or a legacy SF Symbol name. */
  icon: string;
  color: CategoryColorKey;
  /** Footprint in points: 38 list, 46 grid, 22 chip. */
  size?: number;
  /** Ignored: the corner radius follows the treatment. Kept so existing call sites compile. */
  radius?: number;
  splitBadge?: boolean;
  /** Force a treatment / icon style (appearance previews). Defaults to the user's choice. */
  background?: IconBackground;
  iconStyle?: IconStyle;
};

function IconTile({
  icon,
  color,
  size = 38,
  radius: _radius,
  splitBadge = false,
  background,
  iconStyle,
}: IconTileProps) {
  const { colors, category, isDark } = useTokens();
  const chosen = useIconPrefs((s) => s.background);
  const spec = tileSpec(background ?? chosen, isDark, category[color]);
  const glyph = Math.round(size * spec.iconScale);
  const radius = tileRadius(size);
  const glyphNode = (
    <AppIcon
      name={icon}
      size={glyph}
      color={spec.icon}
      secondaryColor={spec.secondary}
      secondaryOpacity={spec.secondaryOpacity}
      iconStyle={iconStyle}
    />
  );

  let body: React.ReactNode;
  if (spec.kind === "none") {
    body = (
      <View
        style={{ width: size, height: size }}
        className="items-center justify-center"
      >
        {glyphNode}
      </View>
    );
  } else if (spec.kind === "plain") {
    body = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          borderCurve: "continuous",
          backgroundColor: spec.base,
          borderColor: spec.rim,
          borderWidth: 1,
        }}
        className="items-center justify-center"
      >
        {glyphNode}
      </View>
    );
  } else {
    const halo = Math.round(glyph * 1.9);
    body = (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderCurve: "continuous",
          },
          gradientStyle(spec.rimGradient ?? ""),
        ]}
      >
        <View
          style={[
            {
              position: "absolute",
              top: 1,
              left: 1,
              right: 1,
              bottom: 1,
              borderRadius: radius - 1,
              borderCurve: "continuous",
              overflow: "hidden",
            },
            gradientStyle(spec.face ?? ""),
          ]}
          className="items-center justify-center"
        >
          <View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: -size * 0.1,
                top: -size * 0.55,
                width: size * 1.2,
                height: size * 0.85,
                borderRadius: size,
              },
              gradientStyle(spec.sheen ?? ""),
            ]}
          />
          {spec.halo ? (
            <View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  width: halo,
                  height: halo,
                  borderRadius: halo / 2,
                },
                gradientStyle(
                  `radial-gradient(circle closest-side, ${spec.halo}, ${clear(spec.halo)})`,
                ),
              ]}
            />
          ) : null}
          {glyphNode}
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      {body}
      {splitBadge ? (
        <View
          style={{
            borderColor: colors.surface,
            backgroundColor: colors.fill,
            borderWidth: StyleSheet.hairlineWidth * 3,
          }}
          className="absolute -bottom-1 -right-1 h-[14px] w-[14px] items-center justify-center rounded-full"
        >
          <AppIcon name="split" size={8} color={colors.textSecondary} />
        </View>
      ) : null}
    </View>
  );
}

export { IconTile };
export type { IconTileProps };
