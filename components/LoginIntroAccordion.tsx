import React, { useMemo, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';
import { WebView } from 'react-native-webview';
import { ChevronDown } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';

const webVideoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 12,
  backgroundColor: '#000',
};

const buildVideoHtml = (uri: string) => `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="initial-scale=1, maximum-scale=1" />
<style>body{margin:0;background-color:transparent;}video{width:100%;height:100%;background-color:#000;border-radius:12px;}</style>
</head><body><video controls playsinline webkit-playsinline>
<source src="${uri}" type="video/mp4" />
Tu navegador no soporta video.
</video></body></html>`;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface IntroVideoItem {
  id: string;
  title: string;
  description?: string;
  source: number;
}

interface LoginIntroAccordionProps {
  title: string;
  description?: string;
  videos: IntroVideoItem[];
  defaultOpen?: boolean;
}

export function LoginIntroAccordion({
  title,
  description,
  videos,
  defaultOpen = false,
}: LoginIntroAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rotationAnim = useState(new Animated.Value(defaultOpen ? 1 : 0))[0];

  const assets = useMemo(
    () =>
      videos.map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        asset: Asset.fromModule(video.source),
      })),
    [videos]
  );

  const assetUriMap = useMemo(() => {
    return assets.reduce<Record<string, string | undefined>>((acc, item) => {
      acc[item.id] = item.asset.localUri ?? item.asset.uri;
      return acc;
    }, {});
  }, [assets]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    Animated.timing(rotationAnim, {
      toValue: nextState ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();

    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const rotation = useMemo(
    () =>
      rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
      }),
    [rotationAnim]
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={handleToggle} activeOpacity={0.7}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.subtitle}>{description}</Text> : null}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={20} color={colors.blue.main} />
        </Animated.View>
      </TouchableOpacity>

      {isOpen ? (
        <View style={styles.content}>
          {assets.map((video, index) => {
            const videoUri = assetUriMap[video.id];
            const nativeVideoPlayer: React.ReactNode = videoUri ? (
              <WebView
                source={{ html: buildVideoHtml(videoUri) }}
                originWhitelist={["*"]}
                style={styles.webview}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction
                automaticallyAdjustContentInsets={false}
              />
            ) : null;
            return (
              <View key={video.id} style={[styles.videoCard, index > 0 && styles.videoCardSpacing]}>
                <Text style={styles.videoTitle}>{video.title}</Text>
                {video.description ? (
                  <Text style={styles.videoDescription}>{video.description}</Text>
                ) : null}
                {videoUri ? (
                  <View style={styles.webviewContainer}>
                    {Platform.select<React.ReactNode>({
                      web: (
                        <video src={videoUri} controls playsInline style={webVideoStyle} />
                      ),
                      ios: nativeVideoPlayer,
                      android: nativeVideoPlayer,
                      default: nativeVideoPlayer,
                    })}
                  </View>
                ) : (
                  <View style={styles.placeholder}> 
                    <Text style={styles.placeholderText}>Cargando video…</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.gray[500],
    fontSize: 14,
  },
  content: {
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  videoCardSpacing: {
    marginTop: spacing.md,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  videoDescription: {
    color: colors.gray[500],
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  webviewContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  placeholder: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
  },
  placeholderText: {
    color: colors.gray[500],
    fontSize: 13,
  },
});