import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  getOptionLabel = (option) => option.label || option.name || String(option),
  getOptionValue = (option) => option.value || option.id || option,
  className = '',
  onSearch = null,
  debounceMs = 300,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback((e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (onSearch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSearch(term);
      }, debounceMs);
    }
  }, [onSearch, debounceMs]);

  // Filter options based on search term (local filtering when no onSearch)
  const filteredOptions = onSearch
    ? options
    : options.filter((option) => {
        const label = getOptionLabel(option).toLowerCase();
        return label.includes(searchTerm.toLowerCase());
      });

  // Get selected option label
  const selectedOption = options.find((option) => getOptionValue(option) === value);
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : '';

  const handleSelect = (option) => {
    onChange(getOptionValue(option));
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected value / trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`input w-full text-left flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? selectedLabel : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <X
              className="w-4 h-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Type to search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = optionValue === value;

                return (
                  <button
                    key={optionValue ?? index}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                      isSelected ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                    }`}
                  >
                    {optionLabel}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
