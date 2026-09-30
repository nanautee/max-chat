import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

beforeAll(() => {
  /**
   * jsdom не реализует scrollIntoView, а автоскролл ленты к последнему
   * сообщению вызывается из эффекта при каждом обновлении чата.
   */
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }
});

afterEach(() => {
  cleanup();
});
