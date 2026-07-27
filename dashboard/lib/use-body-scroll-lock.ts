import { useEffect } from "react";

// 모달이 열려 있는 동안 배경(body) 스크롤을 잠근다. 모달 내부가 overflow-y-auto라
// 스크롤 체이닝으로 뒤 페이지가 함께 스크롤되는 것을 막는다. 언마운트 시 원복.
// 중첩 모달도 안전: 각 인스턴스가 마운트 시점의 값을 캡처해 복원한다.
export function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}
