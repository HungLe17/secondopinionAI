"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string; detail?: string };

export function CustomSelect({
  id,
  value,
  options,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const selected = options[selectedIndex];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  };

  return (
    <div className={`custom-select ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        id={id}
        type="button"
        className="custom-select-trigger"
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onClick={() => {
          setActiveIndex(Math.max(0, selectedIndex));
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            if (!open) setOpen(true);
            setActiveIndex((current) => (current + direction + options.length) % options.length);
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            choose(activeIndex);
          }
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span>
          <strong>{selected?.label || placeholder}</strong>
          {selected?.detail && <small>{selected.detail}</small>}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div id={listId} className="custom-select-menu" role="listbox" aria-label={placeholder}>
          {options.map((option, index) => (
            <button
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={index === activeIndex ? "is-active" : ""}
              key={option.value}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
              {option.value === value && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
