import { useEffect, useRef } from "react";

// 모달 접근성 공통 처리(TASK-56): Escape 닫기 + 초기 포커스 이동 + 포커스 트랩(Tab 순환)
// + 닫힐 때 직전 포커스 복원. 반환한 ref 를 다이얼로그 컨테이너(role="dialog")에 단다.
// 컨테이너에는 tabIndex={-1}, role="dialog", aria-modal="true", 접근성 이름(aria-label 등)을
// 함께 지정한다.
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  // onClose 가 매 렌더 새 함수여도 이펙트를 재구독하지 않도록 ref 로 최신값을 참조.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const node = ref.current;

    const focusables = (): HTMLElement[] =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null)
        : [];

    // 열릴 때 포커스를 모달 안으로 이동(첫 포커스 요소, 없으면 컨테이너).
    (focusables()[0] ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && node) {
        const items = focusables();
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // 닫힐 때 트리거로 포커스 복원(접근성).
      prevActive?.focus?.();
    };
  }, []);

  return ref;
}
