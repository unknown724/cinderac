import { TouchableOpacity, Text, StyleSheet, useColorScheme } from "react-native"
import { Colors } from "@/constants/theme"

type TButtonProps = {
  title: string,
  onPress?: () => void;
}

const TButton = ({ title, onPress }: TButtonProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"]

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: theme.tint}]} onPress={onPress}>
      <Text style={[styles.text, { color: theme.background }]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default TButton
