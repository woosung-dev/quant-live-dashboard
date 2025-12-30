/**
 * API 에러 핸들링 유틸리티
 * @description 일관된 에러 메시지 및 재시도 로직 제공
 */

import { toast } from 'sonner';

// API 에러 타입
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

// 에러 메시지 맵핑
const ERROR_MESSAGES: Record<number, string> = {
  400: '잘못된 요청입니다.',
  401: '로그인이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  409: '이미 존재하는 데이터입니다.',
  422: '입력값이 올바르지 않습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  500: '서버 오류가 발생했습니다.',
  502: '서버에 연결할 수 없습니다.',
  503: '서비스를 일시적으로 이용할 수 없습니다.',
};

/**
 * HTTP 응답에서 에러 정보 추출
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let message = ERROR_MESSAGES[response.status] || '알 수 없는 오류가 발생했습니다.';
  let code: string | undefined;
  let details: unknown;

  try {
    const data = await response.json();
    if (data.error) {
      message = typeof data.error === 'string' ? data.error : message;
    }
    if (data.message) {
      message = data.message;
    }
    code = data.code;
    details = data.details;
  } catch {
    // JSON 파싱 실패 시 기본 메시지 사용
  }

  return {
    status: response.status,
    message,
    code,
    details,
  };
}

/**
 * API 에러 토스트 표시
 */
export function showApiError(error: ApiError | Error | unknown, fallbackMessage = '오류가 발생했습니다.'): void {
  let message = fallbackMessage;

  if (error instanceof Error) {
    message = error.message || fallbackMessage;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = (error as ApiError).message;
  }

  toast.error(message, {
    duration: 4000,
    action: {
      label: '닫기',
      onClick: () => {},
    },
  });
}

/**
 * 네트워크 에러 확인
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  if (error instanceof Error && error.message.includes('network')) {
    return true;
  }
  return false;
}

/**
 * 재시도 로직이 포함된 fetch 래퍼
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: {
    maxRetries?: number;
    retryDelay?: number;
    showError?: boolean;
  }
): Promise<Response> {
  const { maxRetries = 3, retryDelay = 1000, showError = true } = config || {};
  
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // 성공 또는 클라이언트 에러 (재시도 불필요)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // 서버 에러는 재시도
      if (response.status >= 500) {
        const error = await parseApiError(response);
        lastError = new Error(error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // 네트워크 에러는 재시도
      if (isNetworkError(error) && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }

      throw error;
    }
  }

  // 모든 재시도 실패
  if (showError && lastError) {
    toast.error('네트워크 연결을 확인해주세요.', {
      duration: 5000,
      action: {
        label: '재시도',
        onClick: () => {
          fetchWithRetry(url, options, config);
        },
      },
    });
  }

  throw lastError || new Error('All retries failed');
}

/**
 * 안전한 API 호출 래퍼
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  options?: {
    errorMessage?: string;
    showError?: boolean;
    onError?: (error: unknown) => void;
  }
): Promise<T | null> {
  const { errorMessage, showError = true, onError } = options || {};

  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    
    if (onError) {
      onError(error);
    }

    if (showError) {
      showApiError(error, errorMessage);
    }

    return null;
  }
}
