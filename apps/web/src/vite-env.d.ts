/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Dev only: "true" shows built-in sample rows on empty Workforce pages. */
  readonly VITE_USE_DEMO_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
