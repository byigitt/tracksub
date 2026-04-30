import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SwipeAction = {
  label: string;
  icon: ReactNode;
  /** Background color classes for the revealed action panel. */
  className: string;
  /** Optional aria-label. Falls back to `label`. */
  ariaLabel?: string;
  onAction: () => void;
};

type Props = {
  /** Revealed when dragging the row to the right. */
  leftAction?: SwipeAction;
  /** Revealed when dragging the row to the left. */
  rightAction?: SwipeAction;
  /** Called on tap (no significant horizontal drag). */
  onTap?: () => void;
  /** Disable swipe interaction entirely. */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

const REVEAL_WIDTH = 88; // resting width of revealed action
const COMMIT_THRESHOLD = 140; // dx past which we trigger the action immediately
const TAP_SLOP = 8; // px movement allowed before treating as drag
const VERTICAL_SLOP = 12; // px vertical movement before we abort and let scroll happen

/**
 * Touch/mouse swipeable row with revealed actions on either side.
 *
 * Behaviour:
 * - Drag past REVEAL_WIDTH: snaps to revealed state (action visible).
 * - Drag past COMMIT_THRESHOLD: triggers the action immediately, then snaps closed.
 * - Tap (no drag): triggers `onTap`.
 * - Tap anywhere outside the row while it's open: snaps closed.
 * - Vertical movement wins early: lets the page scroll, no swipe.
 */
export const SwipeableRow = ({
  leftAction,
  rightAction,
  onTap,
  disabled,
  className,
  children,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startRef = useRef<{ x: number; y: number; dx: number } | null>(null);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  // Track whether the row is at rest in a "revealed" position (positive = leftAction shown)
  const restingRef = useRef(0);
  const movedRef = useRef(false);

  // Snap closed when clicking/touching elsewhere
  useEffect(() => {
    if (dx === 0) return;
    const onDocPointer = (e: globalThis.PointerEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      restingRef.current = 0;
      setDx(0);
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, [dx]);

  const clamp = (value: number) => {
    const min = rightAction ? -COMMIT_THRESHOLD - 40 : 0;
    const max = leftAction ? COMMIT_THRESHOLD + 40 : 0;
    return Math.max(min, Math.min(max, value));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    // Ignore right click / middle click
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY, dx: restingRef.current };
    lockedRef.current = null;
    movedRef.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (!start) return;
    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;

    if (lockedRef.current === null) {
      const ax = Math.abs(deltaX);
      const ay = Math.abs(deltaY);
      if (ay > VERTICAL_SLOP && ay > ax) {
        lockedRef.current = 'vertical';
        // Cancel: let the user scroll
        startRef.current = null;
        setDragging(false);
        // snap back to resting
        setDx(restingRef.current);
        return;
      }
      if (ax > TAP_SLOP) {
        lockedRef.current = 'horizontal';
        // Capture so we keep getting events even if the pointer leaves the row
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      }
    }

    if (lockedRef.current !== 'horizontal') return;
    movedRef.current = true;
    setDx(clamp(start.dx + deltaX));
  };

  const finish = (commit: boolean) => {
    const value = dx;
    setDragging(false);
    startRef.current = null;
    const wasMoved = movedRef.current;
    movedRef.current = false;
    const wasHorizontal = lockedRef.current === 'horizontal';
    lockedRef.current = null;

    if (!wasMoved) {
      // Treated as a tap. If currently open, close instead of firing onTap.
      if (restingRef.current !== 0) {
        restingRef.current = 0;
        setDx(0);
        return;
      }
      if (commit) onTap?.();
      return;
    }

    if (!wasHorizontal) {
      setDx(restingRef.current);
      return;
    }

    // Commit thresholds
    if (value >= COMMIT_THRESHOLD && leftAction) {
      restingRef.current = 0;
      setDx(0);
      leftAction.onAction();
      return;
    }
    if (value <= -COMMIT_THRESHOLD && rightAction) {
      restingRef.current = 0;
      setDx(0);
      rightAction.onAction();
      return;
    }

    // Snap to revealed or closed
    if (value >= REVEAL_WIDTH * 0.6 && leftAction) {
      restingRef.current = REVEAL_WIDTH;
      setDx(REVEAL_WIDTH);
      return;
    }
    if (value <= -REVEAL_WIDTH * 0.6 && rightAction) {
      restingRef.current = -REVEAL_WIDTH;
      setDx(-REVEAL_WIDTH);
      return;
    }
    restingRef.current = 0;
    setDx(0);
  };

  const onPointerUp = () => finish(true);
  const onPointerCancel = () => finish(false);

  // Width of the visible action panel scales with how far the row has been dragged
  const leftRevealed = Math.max(0, dx);
  const rightRevealed = Math.max(0, -dx);
  const leftCommitting = leftRevealed >= COMMIT_THRESHOLD;
  const rightCommitting = rightRevealed >= COMMIT_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-lg', className)}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Left action (revealed when dragging right) */}
      {leftAction && (
        <div
          aria-hidden={leftRevealed === 0}
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start',
            leftAction.className,
          )}
          style={{
            width: Math.max(0, leftRevealed),
            paddingLeft: leftCommitting ? 24 : 16,
            transition: dragging ? 'none' : 'width 180ms ease, padding 180ms ease',
          }}
        >
          <ActionContent
            label={leftAction.label}
            icon={leftAction.icon}
            committing={leftCommitting}
            visible={leftRevealed > 24}
          />
        </div>
      )}

      {/* Right action (revealed when dragging left) */}
      {rightAction && (
        <div
          aria-hidden={rightRevealed === 0}
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end',
            rightAction.className,
          )}
          style={{
            width: Math.max(0, rightRevealed),
            paddingRight: rightCommitting ? 24 : 16,
            transition: dragging ? 'none' : 'width 180ms ease, padding 180ms ease',
          }}
        >
          <ActionContent
            label={rightAction.label}
            icon={rightAction.icon}
            committing={rightCommitting}
            visible={rightRevealed > 24}
            align="end"
          />
        </div>
      )}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className={cn(
          'relative select-none',
          onTap && !disabled && '[&>*]:transition-colors hover:[&>*]:bg-accent/40 cursor-pointer',
          dragging && 'cursor-grabbing',
        )}
        style={{
          transform: `translate3d(${dx}px, 0, 0)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const ActionContent = ({
  label,
  icon,
  committing,
  visible,
  align = 'start',
}: {
  label: string;
  icon: ReactNode;
  committing: boolean;
  visible: boolean;
  align?: 'start' | 'end';
}) => (
  <div
    className={cn(
      'flex flex-col items-center gap-1 text-[11px] font-medium transition-transform',
      align === 'end' ? 'ml-auto' : 'mr-auto',
      committing ? 'scale-110' : 'scale-100',
    )}
    style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 120ms ease, transform 160ms ease',
    }}
  >
    <span aria-hidden="true" className="[&_svg]:size-5">
      {icon}
    </span>
    <span>{label}</span>
  </div>
);
