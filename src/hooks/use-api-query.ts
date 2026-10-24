"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage, isAbortError } from "@/lib/http/errors";

interface UseApiQueryOptions {
  enabled?: boolean;
}

interface QueryState<T> {
  data: T | null;
  error: string | null;
  requestKey: string | null;
}

/**
 * Executa uma leitura cancelável. Ao desmontar (ou trocar a `key`), a
 * requisição anterior é abortada e respostas obsoletas são descartadas.
 */
export function useApiQuery<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  key: string,
  options: UseApiQueryOptions = {},
) {
  const { enabled = true } = options;
  const queryRef = useRef(queryFn);
  const [reloadIndex, setReloadIndex] = useState(0);
  const requestKey = `${key}:${reloadIndex}`;
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    requestKey: null,
  });

  useEffect(() => {
    queryRef.current = queryFn;
  }, [queryFn]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    queryRef
      .current(controller.signal)
      .then((data) => {
        if (isCurrent) {
          setState({ data, error: null, requestKey });
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent || isAbortError(error)) {
          return;
        }

        setState({
          data: null,
          error: getErrorMessage(error),
          requestKey,
        });
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [enabled, requestKey]);

  const refetch = useCallback(() => {
    setReloadIndex((index) => index + 1);
  }, []);

  if (!enabled) {
    return { data: null, error: null, isLoading: false, refetch };
  }

  const isLoading = state.requestKey !== requestKey;

  return {
    data: state.data,
    error: isLoading ? null : state.error,
    isLoading,
    refetch,
  };
}
