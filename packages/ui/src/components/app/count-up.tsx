import { AnimatedNumber, type AnimatedNumberProps } from "./animated-number";

/** First-appearance roll from zero; later value changes roll digit by digit as with `AnimatedNumber`. */
function CountUp(props: Omit<AnimatedNumberProps, "intro">) {
  return <AnimatedNumber {...props} intro />;
}

export { CountUp };
