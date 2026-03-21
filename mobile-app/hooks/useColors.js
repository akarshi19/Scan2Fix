import { useTheme } from '../context/ThemeContext';

export default function useColors() {
  const { colors } = useTheme();
  return colors;
}