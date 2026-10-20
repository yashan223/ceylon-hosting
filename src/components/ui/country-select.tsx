"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useId, Fragment } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { COUNTRIES, POPULAR_COUNTRIES, type Country } from "@/lib/countries";

export type CountrySelectProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, country?: Country) => void;
  onCountrySelect?: (country: Country) => void;
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
  onCountrySelect,
  name,
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
      COUNTRIES.find((c) => c.name.toLowerCase() === lower || c.code.toLowerCase() === lower) || {
        name: selectedValue,
        code: "",
        flag: "🌐",
        dialCode: "",
      }
    );
  }, [selectedValue]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCountries = useMemo(() => {
    if (!normalizedQuery) return COUNTRIES;
    const cleanQuery = normalizedQuery.replace(/^\+/, "");
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.code.toLowerCase().includes(normalizedQuery) ||
        c.dialCode.toLowerCase().includes(normalizedQuery) ||
        (cleanQuery && c.dialCode.replace("+", "").includes(cleanQuery)),
    );
  }, [normalizedQuery]);

  const showSections = !normalizedQuery;

  const selectableList = useMemo(() => {
    if (!showSections) return filteredCountries;
    const popularNames = new Set(POPULAR_COUNTRIES.map((c) => c.name));
    const otherCountries = COUNTRIES.filter((c) => !popularNames.has(c.name));
    return [...POPULAR_COUNTRIES, ...otherCountries];
  }, [showSections, filteredCountries]);

  const justSelectedRef = useRef(false);

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
      justSelectedRef.current = true;
      if (!isControlled) {
        setInternalValue(country.name);
      }
      onChange?.(country.name, country);
      onCountrySelect?.(country);
      closeDropdown();
      setTimeout(() => {
        justSelectedRef.current = false;
      }, 250);
    },
    [isControlled, onChange, onCountrySelect, closeDropdown],
  );

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
      const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${focusedIndex}"]`);
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!isOpen) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
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
      setFocusedIndex((prev) => (prev < selectableList.length - 1 ? prev + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : selectableList.length - 1));
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
      className={`country-select-container ${isOpen ? "is-open" : ""}`}
      onKeyDown={handleKeyDown}
    >
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`country-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (disabled || justSelectedRef.current) return;
          if (isOpen) {
            closeDropdown();
          } else {
            openDropdown();
          }
        }}
      >
        <div className="country-select-value">
          {selectedCountry ? (
            <>
              <span className="country-select-flag">{selectedCountry.flag}</span>
              <span className="country-select-name">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="country-select-placeholder">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className="country-select-chevron" />
      </button>

      <input type="hidden" name={name} value={selectedValue} />

      {isOpen && (
        <div
          className="country-select-dropdown"
          role="dialog"
          aria-modal="false"
          onClick={(event) => event.stopPropagation()}
        >
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
              onClick={(e) => e.stopPropagation()}
              placeholder="Search country or code..."
              className="country-select-search-input"
            />
            {query && (
              <button
                type="button"
                className="country-select-clear-btn"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setQuery("");
                  setFocusedIndex(0);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <ul ref={listRef} className="country-select-list" role="listbox" aria-label="Countries">
            {selectableList.length === 0 ? (
              <li className="country-select-empty">
                No countries found matching &ldquo;{query}&rdquo;
              </li>
            ) : (
              selectableList.map((country, index) => {
                const isSelected =
                  selectedCountry?.name.toLowerCase() === country.name.toLowerCase();
                const isFocused = index === focusedIndex;
                const isPopularHeader = showSections && index === 0;
                const isAllHeader = showSections && index === POPULAR_COUNTRIES.length;

                return (
                  <Fragment key={country.code + country.name}>
                    {isPopularHeader && (
                      <li className="country-select-section-header" role="presentation">
                        Suggested
                      </li>
                    )}
                    {isAllHeader && (
                      <li className="country-select-section-header" role="presentation">
                        All Countries
                      </li>
                    )}
                    <li
                      role="option"
                      data-index={index}
                      aria-selected={isSelected}
                      className={`country-select-option ${
                        isSelected ? "is-selected" : ""
                      } ${isFocused ? "is-focused" : ""}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleSelect(country);
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <span className="country-select-flag">{country.flag}</span>
                      <span className="country-select-option-name">{country.name}</span>
                      {country.dialCode && (
                        <span className="country-select-dial-code">{country.dialCode}</span>
                      )}
                      <span className="country-select-code-badge">{country.code}</span>
                      {isSelected && <Check size={14} className="country-select-check" />}
                    </li>
                  </Fragment>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
