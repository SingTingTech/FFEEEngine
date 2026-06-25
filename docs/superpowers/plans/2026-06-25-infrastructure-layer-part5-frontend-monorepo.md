# Part 5: Frontend Monorepo

**Phase:** 5 of 7
**Tasks:** 5.1 – 5.10
**End state:** `pnpm dev` serves `http://localhost:5173` with a placeholder page; monorepo workspace, shared-types, form-embeddable stub, and platform-admin app all in place.

**Pre-requisite:** Phase 4 complete (backend boots).

---

## Task 5.1: Root package.json + pnpm-workspace.yaml

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/pnpm-workspace.yaml`
- Create: `frontend/.npmrc`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "safe-validator-frontend",
  "version": "1.0.0",
  "private": true,
  "description": "safeValidator form engine — frontend monorepo",
  "scripts": {
    "dev": "pnpm --filter platform-admin dev",
    "build": "pnpm -r build",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "eslint": "^9.13.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.12.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create .npmrc**

```ini
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
```

- [ ] **Step 4: Commit**

```bash
cd /home/cris/dev/safeValidator/frontend
git add package.json pnpm-workspace.yaml .npmrc
git commit -m "chore: init frontend monorepo with pnpm workspaces"
```

---

## Task 5.2: Base TypeScript config

**Files:**
- Create: `frontend/tsconfig.base.json`
- Create: `frontend/tsconfig.json`

- [ ] **Step 1: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false
  }
}
```

- [ ] **Step 2: Create root tsconfig.json**

```json
{
  "extends": "./tsconfig.base.json",
  "include": [],
  "references": [
    { "path": "./apps/platform-admin" },
    { "path": "./packages/shared-types" },
    { "path": "./packages/form-embeddable" }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add tsconfig.base.json tsconfig.json
git commit -m "chore: add base TypeScript configuration with strict mode"
```

---

## Task 5.3: shared-types package

**Files:**
- Create: `frontend/packages/shared-types/package.json`
- Create: `frontend/packages/shared-types/tsconfig.json`
- Create: `frontend/packages/shared-types/src/index.ts`
- Create: `frontend/packages/shared-types/src/api.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@safe-validator/shared-types",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create api.ts**

```typescript
// Shared API response types — matches backend Result<T> contract

export interface Result<T> {
  code: number;
  message: string;
  data: T | null;
}

export const isSuccess = <T>(r: Result<T>): r is Result<T> & { data: T } =>
  r.code === 0 && r.data !== null;

export interface PageQuery {
  pageNum?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  keyword?: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}
```

- [ ] **Step 4: Create index.ts**

```typescript
export * from './api';
```

- [ ] **Step 5: Commit**

```bash
cd frontend
git add packages/shared-types
git commit -m "feat(shared-types): add Result<T> and pagination types"
```

---

## Task 5.4: form-embeddable package (placeholder)

**Files:**
- Create: `frontend/packages/form-embeddable/package.json`
- Create: `frontend/packages/form-embeddable/tsconfig.json`
- Create: `frontend/packages/form-embeddable/src/index.ts`
- Create: `frontend/packages/form-embeddable/README.md`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@safe-validator/form-embeddable",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./FormFiller": "./src/FormFiller.tsx",
    "./FormViewer": "./src/FormViewer.tsx",
    "./FormList": "./src/FormList.tsx"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "antd": "^5.21.0"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create placeholder index.ts**

```typescript
// Placeholder exports — implemented in sub-project 4
export const FORM_EMBEDDABLE_VERSION = '1.0.0-placeholder';

export interface FormFillerProps {
  formId: string;
  recordId?: string;
  onSubmit?: (data: unknown) => void;
}

export interface FormViewerProps {
  formId: string;
  recordId: string;
}

export interface FormListProps {
  formId: string;
  onRowClick?: (recordId: string) => void;
}
```

- [ ] **Step 4: Create README**

```markdown
# @safe-validator/form-embeddable

Placeholder package. Real implementation arrives in sub-project 4.

Will export three embeddable React components:
- `FormFiller` — interactive form filling
- `FormViewer` — read-only display
- `FormList` — queryable list
```

- [ ] **Step 5: Commit**

```bash
cd frontend
git add packages/form-embeddable
git commit -m "feat(form-embeddable): scaffold placeholder package"
```

---

## Task 5.5: platform-admin app skeleton

**Files:**
- Create: `frontend/apps/platform-admin/package.json`
- Create: `frontend/apps/platform-admin/tsconfig.json`
- Create: `frontend/apps/platform-admin/tsconfig.node.json`
- Create: `frontend/apps/platform-admin/vite.config.ts`
- Create: `frontend/apps/platform-admin/index.html`
- Create: `frontend/apps/platform-admin/src/main.tsx`
- Create: `frontend/apps/platform-admin/src/App.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "platform-admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@safe-validator/form-embeddable": "workspace:*",
    "@safe-validator/shared-types": "workspace:*",
    "@tanstack/react-query": "^5.59.0",
    "antd": "^5.21.0",
    "axios": "^1.7.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.27.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vite/client"]
  },
  "include": ["src/**/*", "vite.config.ts"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>safeValidator Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
```

- [ ] **Step 6: Create App.tsx (placeholder)**

```typescript
import { Routes, Route } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          safeValidator Admin
        </Typography.Title>
      </Header>
      <Layout>
        <Sider width={220} theme="light">
          <Menu mode="inline" defaultSelectedKeys={['home']} items={[
            { key: 'home', label: <Link to="/">首页</Link> },
            { key: 'users', label: <Link to="/users">用户管理</Link> },
            { key: 'roles', label: <Link to="/roles">角色管理</Link> },
          ]} />
        </Sider>
        <Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<div>基础设施层占位页 — Phase 6 实现登录与 CRUD</div>} />
            <Route path="/users" element={<div>用户管理（Phase 6 实现）</div>} />
            <Route path="/roles" element={<div>角色管理（Phase 6 实现）</div>} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
```

- [ ] **Step 7: Commit**

```bash
cd frontend
git add apps/platform-admin
git commit -m "feat(platform-admin): scaffold Vite + React + AntD admin app"
```

---

## Task 5.6: Install dependencies

- [ ] **Step 1: Run pnpm install**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm install
```

Expected: All workspace deps installed without errors. `node_modules/.pnpm` populated.

- [ ] **Step 2: Verify install**

```bash
ls -la node_modules/.pnpm | head -5
ls apps/platform-admin/node_modules/.pnpm | head -5
```

- [ ] **Step 3: Commit lockfile**

```bash
cd frontend
git add pnpm-lock.yaml
git commit -m "chore: lock dependencies with pnpm-lock.yaml"
```

---

## Task 5.7: ESLint + Prettier setup

**Files:**
- Create: `frontend/.eslintrc.cjs`
- Create: `frontend/.prettierrc`
- Create: `frontend/.prettierignore`

- [ ] **Step 1: Create .eslintrc.cjs**

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-refresh/only-export-components': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', '*.config.*'],
};
```

- [ ] **Step 2: Add ESLint deps**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm add -Dw @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks eslint-plugin-react-refresh
```

- [ ] **Step 3: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 4: Create .prettierignore**

```
node_modules
dist
*.lock
pnpm-lock.yaml
```

- [ ] **Step 5: Commit**

```bash
cd frontend
git add .eslintrc.cjs .prettierrc .prettierignore package.json
git commit -m "chore: add ESLint + Prettier configuration"
```

---

## Task 5.8: Phase 5 verification

- [ ] **Step 1: Confirm frontend structure**

```bash
cd /home/cris/dev/safeValidator/frontend
ls -1 apps/ packages/
```

Expected:
```
apps/
  platform-admin
packages/
  form-embeddable
  shared-types
```

- [ ] **Step 2: Run typecheck across monorepo**

```bash
cd /home/cris/dev/safeValidator/frontend
pnpm typecheck
```

Expected: all packages compile without errors.

- [ ] **Step 3: Start dev server (background)**

```bash
cd /home/cris/dev/safeValidator/frontend
nohup pnpm dev > /tmp/sv-dev.log 2>&1 &
sleep 8
cat /tmp/sv-dev.log
```

Expected: `Vite ... ready in ... ms` and `Local: http://localhost:5173`

- [ ] **Step 4: Test dev server**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

Expected: `200`

- [ ] **Step 5: Stop dev server**

```bash
pkill -f "vite" || true
```

- [ ] **Step 6: Commit any final touches**

```bash
cd frontend
git status
git add -A
git commit -m "chore: phase 5 verified" --allow-empty
```

**Phase 5 complete.** Proceed to [Part 6: Frontend Pages & State](./2026-06-25-infrastructure-layer-part6-frontend-pages.md).
