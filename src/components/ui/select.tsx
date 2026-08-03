"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  isValidElement,
} from "react";

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

/** Flatten option children (may contain strings/numbers/elements) into text. */
function flattenText(node: ReactNode): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    return flattenText(children);
  }
  return "";
}

/** Read one `<option>` element into a SelectOption; returns null for anything else. */
function toOption(child: ReactNode): SelectOption | null {
  if (!isValidElement(child) || child.type !== "option") return null;
  const { value, children, disabled } = child.props as {
    value?: string | number | readonly string[];
    children?: ReactNode;
    disabled?: boolean;
  };
  return { value: String(value ?? ""), label: flattenText(children), disabled: Boolean(disabled) };
}

/**
 * Custom select dropdown — same look as Input (DESIGN.md §5).
 *
 * Native `<select>` renders an OS-styled popup that cannot be styled, so this
 * uses a button + listbox pattern (combobox semantics) styled with the app
 * tokens: rounded-xl field, `surface` panel with border + shadow, `primary`
 * hover/focus. Keeps the `<select>`-like API (value, onChange with
 * `e.target.value`, children `<option>`s) so existing call sites stay unchanged.
 */
export function Select({
  className = "",
  children,
  value,
  onChange,
  disabled = false,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = useMemo(
    () =>
      Children.toArray(children)
        .map(toOption)
        .filter((o): o is SelectOption => o !== null),
    [children],
  );

  const selectedIndex = options.findIndex((o) => o.value === String(value));
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : "";

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listId = useId();

  const openMenu = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const selectOption = (index: number) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    // Synthetic event so call sites can keep reading `e.target.value`.
    onChange?.({ target: { value: opt.value } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  // Close when the user clicks/taps outside the component.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Keep the keyboard-highlighted option in view while scrolling the panel.
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectOption(activeIndex);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        // Call sites only pass select-safe props (id, name, aria-*, data-*);
        // explicit handlers below always win over the spread.
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface py-3 pl-3 pr-10 text-left text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span
          className={`truncate ${selectedIndex < 0 ? "text-ink-secondary" : ""}`}
        >
          {selectedLabel || " "}
        </span>
        <ChevronDown
          aria-hidden
          className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === String(value);
            const isActive = activeIndex === i;
            return (
              <li
                key={opt.value}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectOption(i)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm ${
                    isSelected || isActive ? "bg-primary/10 text-primary" : "text-ink"
                  } ${opt.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
