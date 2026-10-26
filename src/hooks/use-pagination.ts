"use client";

import { useMemo, useState } from "react";

interface UsePaginationOptions {
  pageSize?: number;
  resetKey?: string | number | boolean;
}

export function usePagination<T>(
  items: readonly T[],
  { pageSize = 5, resetKey }: UsePaginationOptions = {},
) {
  const [page, setPage] = useState(1);
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);

  if (resetKey !== previousResetKey) {
    setPreviousResetKey(resetKey);
    setPage(1);
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = useMemo(
    () =>
      items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, items, pageSize],
  );
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  return {
    page: currentPage,
    pageItems,
    totalItems,
    totalPages,
    rangeStart,
    rangeEnd,
    setPage,
  };
}
