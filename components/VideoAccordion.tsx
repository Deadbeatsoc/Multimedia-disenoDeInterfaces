import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ChevronDown } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface VideoAccordionProps {
  title: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  color?: string;
  isOpen?: boolean;
}

export function VideoAccordion({
  title,
  description = '',
  videoUrl = '',
  thumbnailUrl = '',
  color = colors.blue.main,
  isOpen: controlledIsOpen = false,
}: VideoAccordionProps) {
  const [isOpen, setIsOpen] = useState(controlledIsOpen);
  const rotationAnim = useState(new Animated.Value(isOpen ? 1 : 0))[0];

  const toggleAccordion = () => {
    const newState = !isOpen;
    setIsOpen(newState);

    Animated.timing(rotationAnim, {
      toValue: newState ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const hasVideo = videoUrl && videoUrl.trim().length > 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, { borderBottomColor: color }]}
        onPress={toggleAccordion}
        activeOpacity={0.7}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={20} color={color} />
        </Animated.View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.content}>
          {hasVideo ? (
            <View style={styles.videoContainer}>
              <WebView
                source={{ uri: videoUrl }}
                style={styles.webview}
                scrollEnabled={false}
                allowsFullscreenVideo={true}
              />
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={[styles.placeholderBox, { borderColor: color }]}>
                <Text style={[styles.placeholderText, { color }]}>📹</Text>
                <Text style={styles.placeholderTitle}>Video Próximamente</Text>
                <Text style={styles.placeholderDescription}>
                  Este video se agregará pronto. Vuelve más tarde.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.blue.main,
  },
  headerContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    color: colors.gray[500],
  },
  content: {
    padding: spacing.lg,
  },
  videoContainer: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  placeholderBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    width: '100%',
  },
  placeholderText: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  placeholderDescription: {
    fontSize: 13,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
