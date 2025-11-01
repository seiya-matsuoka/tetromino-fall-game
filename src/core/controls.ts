import type { InputController, VisualState } from './input';

//  画面ボタン（← → ↓ 回転）と InputController を接続。
export function setupControlsUI(inputController: InputController) {
  const btnLeft = document.getElementById('btn-left') as HTMLElement | null;
  const btnRight = document.getElementById('btn-right') as HTMLElement | null;
  const btnDown = document.getElementById('btn-down') as HTMLElement | null;
  const btnRot = document.getElementById('btn-rot') as HTMLElement | null;

  const disposers: Array<() => void> = [];

  const setActive = (el: HTMLElement | null, active: boolean) => {
    if (!el) return;
    el.classList.toggle('is-active', active);
  };

  // --- 長押し: 左/右/下 ---
  function bindHoldButton(el: HTMLElement, key: 'left' | 'right' | 'down') {
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      setActive(el, true);
      inputController.setHold(key, true);
    };
    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      setActive(el, false);
      inputController.setHold(key, false);
    };

    el.addEventListener('pointerdown', onPointerDown, { passive: false });
    el.addEventListener('pointerup', onPointerUp, { passive: false });
    el.addEventListener('pointercancel', onPointerUp, { passive: false });
    el.addEventListener('pointerleave', onPointerUp, { passive: false });

    disposers.push(() => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
    });
  }

  // --- タップ: 回転 ---
  function bindTapButton(el: HTMLElement, onTap: () => void) {
    const onPress = (e: PointerEvent) => {
      e.preventDefault();
      setActive(el, true);
      onTap();
    };
    const onRelease = (e: PointerEvent) => {
      e.preventDefault();
      setActive(el, false);
    };

    el.addEventListener('pointerdown', onPress, { passive: false });
    el.addEventListener('pointerup', onRelease, { passive: false });
    el.addEventListener('pointercancel', onRelease, { passive: false });
    el.addEventListener('pointerleave', onRelease, { passive: false });

    disposers.push(() => {
      el.removeEventListener('pointerdown', onPress);
      el.removeEventListener('pointerup', onRelease);
      el.removeEventListener('pointercancel', onRelease);
      el.removeEventListener('pointerleave', onRelease);
    });
  }

  if (btnLeft) bindHoldButton(btnLeft, 'left');
  if (btnRight) bindHoldButton(btnRight, 'right');
  if (btnDown) bindHoldButton(btnDown, 'down');
  if (btnRot) bindTapButton(btnRot, () => inputController.tapRotate());

  // --- キーボード操作の可視化を同期 ---
  inputController.setVisualListener((v: VisualState) => {
    setActive(btnLeft, v.left);
    setActive(btnRight, v.right);
    setActive(btnDown, v.down);
    setActive(btnRot, v.rot);
  });

  function dispose() {
    disposers.forEach((fn) => fn());
    inputController.setVisualListener(null);
  }

  return { dispose };
}
