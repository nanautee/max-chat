import { describe, expect, it } from 'vitest';
import {
  avatarColor,
  formatChatDay,
  formatListTime,
  formatPhone,
  initials,
  normalizePhone,
} from './format';

describe('normalizePhone', () => {
  it('приводит 10 цифр к префиксу 7', () => {
    expect(normalizePhone('9991234567')).toBe('79991234567');
  });

  it('заменяет ведущую 8 на 7', () => {
    expect(normalizePhone('8 999 123-45-67')).toBe('79991234567');
    expect(normalizePhone('8-999-123-45-67')).toBe('79991234567');
  });

  it('оставляет корректный номер РФ без изменений', () => {
    expect(normalizePhone('+7 999 123 45 67')).toBe('79991234567');
    expect(normalizePhone('79991234567')).toBe('79991234567');
  });

  it('поддерживает номера РБ с префиксом 375', () => {
    expect(normalizePhone('375 29 123-45-67')).toBe('375291234567');
  });

  it('отбрасывает пробелы, скобки и дефисы', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
  });

  it('возвращает null для неподдерживаемых длин', () => {
    expect(normalizePhone('123456789')).toBeNull();
    expect(normalizePhone('123456789012345')).toBeNull();
  });

  it('возвращает null для неверных префиксов', () => {
    expect(normalizePhone('99912345679')).toBeNull();
    expect(normalizePhone('1234567890')).toBeNull();
    expect(normalizePhone('123456789')).toBeNull();
  });

  it('возвращает null для пустой строки и строки без цифр', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('абв')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('форматирует номер РФ', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67');
  });

  it('форматирует номер РБ', () => {
    expect(formatPhone('375291234567')).toBe('+375 29 123-45-67');
  });

  it('не ломается на нестандартном номере', () => {
    expect(formatPhone('123')).toBe('+123');
  });
});

describe('initials', () => {
  it('берёт первые две буквы одного слова', () => {
    expect(initials('Анна')).toBe('АН');
  });

  it('берёт первые буквы имени и фамилии', () => {
    expect(initials('Анна Петрова')).toBe('АП');
  });

  it('возвращает placeholder для пустой строки', () => {
    expect(initials('   ')).toBe('#');
  });
});

describe('avatarColor', () => {
  it('детерминирован для одной строки и различает разные', () => {
    expect(avatarColor('79991234567')).toBe(avatarColor('79991234567'));
    expect(avatarColor('79991234567')).not.toBe(avatarColor('79990000000'));
  });
});

describe('форматирование дат', () => {
  const today = new Date();

  it('сегодняшний день подписывается как «Сегодня»', () => {
    expect(formatChatDay(today.getTime())).toBe('Сегодня');
    expect(formatListTime(today.getTime())).toMatch(/\d{2}:\d{2}/);
  });

  it('вчерашний день подписывается как «Вчера»', () => {
    const yesterday = new Date(today.getTime() - 86_400_000);
    expect(formatChatDay(yesterday.getTime())).toBe('Вчера');
    expect(formatListTime(yesterday.getTime())).toBe('вчера');
  });

  it('более старые даты выводятся датой', () => {
    const old = new Date(today.getTime() - 5 * 86_400_000);
    expect(formatChatDay(old.getTime())).toMatch(/\d/);
    expect(formatListTime(old.getTime())).toMatch(/\d{2}\.\d{2}/);
  });
});