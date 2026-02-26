import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId?: string;
}

const requestContextStore = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext(
  context: RequestContext,
  callback: () => void,
): void {
  requestContextStore.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}

export function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}
