import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('показывает инициалы, когда аватара нет', () => {
    render(<Avatar name="Анна Петрова" />);

    expect(screen.getByTitle('Анна Петрова')).toHaveTextContent('АП');
  });

  it('показывает картинку, когда URL доступен', () => {
    render(<Avatar name="Анна Петрова" src="https://cdn.example/avatar.jpg" />);

    expect(screen.getByRole('presentation', { hidden: true })).toHaveAttribute(
      'src',
      'https://cdn.example/avatar.jpg',
    );
  });

  it('устанавливает referrerPolicy, чтобы CDN не блокировал запрос', () => {
    render(<Avatar name="Анна" src="https://cdn.example/avatar.jpg" />);

    expect(screen.getByRole('presentation', { hidden: true })).toHaveAttribute(
      'referrerPolicy',
      'no-referrer',
    );
  });

  it('показывает точку присутствия при online', () => {
    const { container } = render(<Avatar name="Анна" online />);

    expect(container.querySelector('span > span')).not.toBeNull();
  });

  it('учитывает размер при вычислении инициалов', () => {
    render(<Avatar name="А" size={80} />);

    expect(screen.getByTitle('А')).toHaveTextContent('А');
  });
});