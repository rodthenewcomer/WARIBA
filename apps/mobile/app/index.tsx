import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Redirect } from "expo-router";
import { StartAnimation } from "../src/components/StartAnimation";
import { ONBOARDING_VERSION, useSettingsStore } from "../src/stores";
import { colors } from "../src/theme";

/**
 * Point d'entrée au lancement à froid : signature animée (~1,8 s,
 * sautée si « réduire les animations »), puis onboarding à la première
 * ouverture, sinon les onglets. Les données se chargent pendant
 * l'animation — elle n'ajoute aucune attente.
 */
export default function Index() {
  const [introDone, setIntroDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const onboarded = useSettingsStore((state) => state.onboardingVersion >= ONBOARDING_VERSION);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  if (introDone) return <Redirect href={onboarded ? "/(tabs)" : "/onboarding"} />;
  if (reduceMotion === null) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return <StartAnimation reduceMotion={reduceMotion} onDone={() => setIntroDone(true)} />;
}
