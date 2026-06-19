import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  Button, Toggle, Input, PasswordInput, Badge, EncryptionBadge,
  SectionHeader, Card, Alert, Divider, RangeSlider
} from '../ui';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('applies variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByText('Delete');
    expect(btn.className).toContain('red');
  });

  it('disables when loading', () => {
    render(<Button isLoading>Loading</Button>);
    const btn = screen.getByText('Loading');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('disables when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByText('Disabled');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('applies sm size class', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByText('Small');
    expect(btn.className).toContain('px-3');
  });
});

describe('Toggle', () => {
  it('renders with correct initial state', () => {
    render(<Toggle enabled={false} onChange={() => {}} />);
    const btn = document.querySelector('button');
    expect(btn).toBeDefined();
  });

  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<Toggle enabled={false} onChange={onChange} />);
    const btn = document.querySelector('button')!;
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('applies red color class when enabled with red variant', () => {
    render(<Toggle enabled={true} onChange={() => {}} color="red" />);
    const btn = document.querySelector('button')!;
    expect(btn.className).toContain('bg-red-500');
  });
});

describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeDefined();
  });

  it('renders error message', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('shows error border when error is set', () => {
    render(<Input error="Error" />);
    const input = document.querySelector('input')!;
    expect(input.className).toContain('border-red-500');
  });
});

describe('PasswordInput', () => {
  it('renders with password type by default', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const input = document.querySelector('input')!;
    expect(input.type).toBe('password');
  });

  it('toggles visibility on eye click', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const toggleBtn = document.querySelector('button')!;
    fireEvent.click(toggleBtn);
    const input = document.querySelector('input')!;
    expect(input.type).toBe('text');
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('applies success variant', () => {
    render(<Badge variant="success">Done</Badge>);
    const badge = screen.getByText('Done');
    expect(badge.className).toContain('bg-neon-green');
  });
});

describe('EncryptionBadge', () => {
  it('renders algorithm name', () => {
    render(<EncryptionBadge algorithm="AES-GCM" />);
    expect(screen.getByText('AES-GCM')).toBeDefined();
  });

  it('strips Poly1305 suffix in compact mode', () => {
    render(<EncryptionBadge algorithm="ChaCha20-Poly1305" compact />);
    expect(screen.getByText('CHACHA')).toBeDefined();
  });
});

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Security" />);
    expect(screen.getByText('Security')).toBeDefined();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('calls onClick when clicked and hoverable', () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick} hoverable>Clickable</Card>);
    fireEvent.click(screen.getByText('Clickable'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Warning message</Alert>);
    expect(screen.getByText('Warning message')).toBeDefined();
  });

  it('renders title', () => {
    render(<Alert title="Heads up">Content</Alert>);
    expect(screen.getByText('Heads up')).toBeDefined();
  });

  it('applies error variant class', () => {
    const { container } = render(<Alert type="error">Error</Alert>);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('bg-red-500');
  });
});

describe('Divider', () => {
  it('renders a horizontal rule', () => {
    const { container } = render(<Divider />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('h-px');
  });
});

describe('RangeSlider', () => {
  it('renders label', () => {
    render(<RangeSlider value={50} onChange={() => {}} label="Volume" />);
    expect(screen.getByText('Volume')).toBeDefined();
  });

  it('shows value with unit', () => {
    render(<RangeSlider value={75} onChange={() => {}} unit="%" />);
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('calls onChange when slider changes', () => {
    const onChange = vi.fn();
    render(<RangeSlider value={50} onChange={onChange} />);
    const slider = document.querySelector('input[type="range"]')!;
    fireEvent.change(slider, { target: { value: '80' } });
    expect(onChange).toHaveBeenCalledWith(80);
  });
});
