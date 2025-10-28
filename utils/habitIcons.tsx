import React from 'react';
import {
  Droplets,
  Moon,
  Dumbbell,
  Apple,
  type LucideIcon,
} from 'lucide-react-native';

const iconMap: Record<string, LucideIcon> = {
  Droplets,
  Moon,
  Dumbbell,
  Apple,
};

export function getHabitIcon(
  iconName: string,
  color: string,
  size = 24
): React.ReactNode {
  const IconComponent = iconMap[iconName] ?? Droplets;
  return <IconComponent size={size} color={color} />;
}
