import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import i18n from "~/i18n";

export function SearchBar({ query: initialQuery = "" }: { query?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const t = i18n.t;
  const isSearchPage = location.pathname.startsWith("/app/search");

  const clearDebounce = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const updateUrl = useCallback(
    (nextQuery: string) => {
      const trimmedQuery = nextQuery.trim();

      if (isSearchPage) {
        const searchParams = new URLSearchParams(location.search);

        if (trimmedQuery) {
          searchParams.set("q", trimmedQuery);
        } else {
          searchParams.delete("q");
        }

        const search = searchParams.toString();
        void navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
        return;
      }

      if (!trimmedQuery) {
        return;
      }

      void navigate(`/app/search/lists?q=${encodeURIComponent(trimmedQuery)}`, { replace: true });
    },
    [isSearchPage, location.pathname, location.search, navigate]
  );

  useEffect(() => {
    setQuery(initialQuery);
    clearDebounce();
  }, [initialQuery, clearDebounce]);

  useEffect(() => {
    if (query.trim() === initialQuery.trim()) {
      return;
    }

    clearDebounce();
    debounceRef.current = setTimeout(() => updateUrl(query), 300);
    return clearDebounce;
  }, [query, initialQuery, clearDebounce, updateUrl]);

  useEffect(() => {
    clearDebounce();
  }, [location.pathname, location.search, clearDebounce]);

  const onSubmit = () => {
    clearDebounce();
    updateUrl(query);
  };

  return (
    <div
      className={`bg-neutral-200 dark:bg-neutral-800 h-10 my-2 rounded-full flex items-center px-3 gap-2 ${isSearchPage ? "flex-1 min-w-0" : ""}`}
      onClick={() => inputRef.current?.focus()}
    >
      <Search className="shrink-0 text-neutral-600 dark:text-neutral-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          const nextQuery = e.target.value;
          setQuery(nextQuery);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder={t?.("search.placeholder") ?? "Search..."}
        className="bg-transparent outline-none w-full text-sm text-neutral-800 dark:text-neutral-100"
        aria-label={t?.("search.ariaLabel") ?? "Search"}
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearDebounce();
            setQuery("");
            updateUrl("");
            inputRef.current?.focus();
          }}
          className="p-1 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700"
          aria-label={t?.("search.clear") ?? "Clear search"}
        >
          <X className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        </button>
      )}
    </div>
  );
}