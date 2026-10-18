"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
} from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import {
  COUNTRIES,
  POPULAR_COUNTRIES,
  type Country,
} from "@/lib/countries";

export type CountrySelectProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
};

export function CountrySelect({
  value: controlledValue,
  defaultValue = "",
  onChange,
  name,
  required = false,
  disabled = false,
  placeholder = "Select your country",
  id,
}: CountrySelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedCountry = useMemo(() => {
    if (!selectedValue) return null;
    const lower = selectedValue.trim().toLowerCase();
    return (
      COUNTRIES.find(
        (c) =>
          c.name.toLowerCase() === lower || c.code.toLowerCase() === lower
      ) || { name: selectedValue, code: "", flag: "🌐" }
    );
  }, [selectedValue]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCountries = useMemo(() => {
    if (!normalizedQuery) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.code.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const showSections = !normalizedQuery;

  const selectableList = useMemo(() => {
    if (!showSections) return filteredCountries;
    const popularNames = new Set(POPULAR_COUNTRIES.map((c) => c.name));
    const otherCountries = COUNTRIES.filter((c) => !popularNames.has(c.name));
    return [...POPULAR_COUNTRIES, ...otherCountries];
  }, [showSections, filteredCountries]);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setFocusedIndex(0);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setFocusedIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (country: Country) => {
      if (!isControlled) {
        setInternalValue(country.name);
      }
      onChange?.(country.name);
      closeDropdown();
    },
    [isControlled, onChange, closeDropdown]
  );

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[
        focusedIndex
      ] as HTMLElement | undefined;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!isOpen) {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        openDropdown();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedIndex((prev) =>
        prev < selectableList.length - 1 ? prev + 1 : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : selectableList.length - 1
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < selectableList.length) {
        handleSelect(selectableList[focusedIndex]);
      }
    } else if (event.key === "Tab") {
      closeDropdown();
    }
  }

  return (
    <div
      ref={containerRef}
      className="country-select-container"
      onKeyDown={handleKeyDown}
    >
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`country-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => !disabled && (isOpen ? closeDropdown() : openDropdown())}
      >
        <div className="country-select-value">
          {selectedCountry ? (
            <>
              <span className="country-select-flag">
                {selectedCountry.flag}
              </span>
              <span className="country-select-name">
                {selectedCountry.name}
              </span>
            </>
          ) : (
            <span className="country-select-placeholder">
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown size={16} className="country-select-chevron" />
      </button>

      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        required={required}
        value={selectedValue}
        onChange={() => {}}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
          bottom: 0,
          left: 0,
        }}
      />

      {isOpen && (
        <div className="country-select-dropdown" role="dialog" aria-modal="false">
          <div className="country-select-search-wrap">
            <Search size={14} className="country-select-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIndex(0);
              }}
              placeholder="Search country or code..."
              className="country-select-search-input"
            />
            {query && (
              <button
                type="button"
                className="country-select-clear-btn"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <ul
            ref={listRef}
            className="country-select-list"
            role="listbox"
            aria-label="Countries"
          >
            {selectableList.length === 0 ? (
              <li className="country-select-empty">
                No countries found matching &ldquo;{query}&rdquo;
              </li>
            ) : (
              selectableList.map((country, index) => {
                const isSelected =
                  selectedCountry?.name.toLowerCase() ===
                  country.name.toLowerCase();
                const isFocused = index === focusedIndex;

                return (
                  <li
                    key={country.code + country.name}
                    role="option"
                    aria-selected={isSelected}
                    className={`country-select-option ${
                      isSelected ? "is-selected" : ""
                    } ${isFocused ? "is-focused" : ""}`}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <span className="country-select-flag">
                      {country.flag}
                    </span>
                    <span className="country-select-option-name">
                      {country.name}
                    </span>
                    <span className="country-select-code-badge">
                      {country.code}
                    </span>
                    {isSelected && (
                      <Check size={14} className="country-select-check" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
