import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// AntD responsive observer uses window.matchMedia; jsdom does not provide it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// jsdom does not implement getComputedStyle with a pseudoElt (e.g. "::-webkit-scrollbar").
// AntD's rc-table calls it inside useLayoutEffect; we stub the pseudoElt to "" so jsdom returns a normal CSSStyleDeclaration.
if (typeof window !== 'undefined') {
  const original = window.getComputedStyle.bind(window);
  window.getComputedStyle = ((elt: Element) =>
    original(elt, '')) as typeof window.getComputedStyle;
}

afterEach(() => {
  cleanup();
});
