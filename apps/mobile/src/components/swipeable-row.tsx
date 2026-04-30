import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type SwipeAction = {
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the action background container. */
  containerClassName: string;
  /** Tailwind classes (text color) applied to label and icon. */
  contentClassName?: string;
  onAction: () => void;
};

type Props = {
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  children: ReactNode;
};

const ACTION_WIDTH = 96;

/**
 * iOS-mail-style swipeable row.
 *
 * - Swipe right past threshold → snaps open with the left action visible.
 * - Swipe left past threshold → snaps open with the right action visible.
 * - Tapping the visible action triggers it and closes the row.
 * - Tapping the row (its child) is unaffected and is handled by the child.
 */
export const SwipeableRow = ({ leftAction, rightAction, children }: Props) => {
  const ref = useRef<SwipeableMethods>(null);

  const trigger = (action: SwipeAction) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    ref.current?.close();
    action.onAction();
  };

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      leftThreshold={ACTION_WIDTH * 0.5}
      rightThreshold={ACTION_WIDTH * 0.5}
      overshootLeft={false}
      overshootRight={false}
      containerStyle={{ borderRadius: 12, overflow: 'hidden' }}
      onSwipeableWillOpen={() => {
        void Haptics.selectionAsync();
      }}
      renderLeftActions={
        leftAction
          ? (progress, translation) => (
              <ActionPanel
                progress={progress}
                translation={translation}
                side="left"
                action={leftAction}
                onPress={() => trigger(leftAction)}
              />
            )
          : undefined
      }
      renderRightActions={
        rightAction
          ? (progress, translation) => (
              <ActionPanel
                progress={progress}
                translation={translation}
                side="right"
                action={rightAction}
                onPress={() => trigger(rightAction)}
              />
            )
          : undefined
      }
    >
      {children}
    </ReanimatedSwipeable>
  );
};

const ActionPanel = ({
  progress,
  translation,
  side,
  action,
  onPress,
}: {
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  side: 'left' | 'right';
  action: SwipeAction;
  onPress: () => void;
}) => {
  // Action panel grows with the drag distance (capped by ACTION_WIDTH so the
  // child content also peeks behind it like iOS Mail).
  const panelStyle = useAnimatedStyle(() => {
    const t = side === 'left' ? translation.value : -translation.value;
    const width = Math.max(0, Math.min(ACTION_WIDTH, t));
    return { width };
  });

  // Icon/label fades in as the action passes a noticeable threshold.
  const contentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.4, 1], [0, 0.6, 1], Extrapolation.CLAMP);
    const scale = interpolate(progress.value, [0, 1, 1.4], [0.85, 1, 1.1], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={panelStyle}
      className={cn(
        'h-full justify-center',
        side === 'left' ? 'items-start pl-4' : 'items-end pr-4',
        action.containerClassName,
      )}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel={action.label}
        className="h-full justify-center"
        hitSlop={8}
      >
        <Animated.View style={contentStyle} className="items-center gap-1">
          <Icon
            as={action.icon}
            size={20}
            className={cn('text-foreground', action.contentClassName)}
          />
          <Text
            className={cn('text-[11px] font-medium', action.contentClassName)}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};
