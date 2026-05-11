# 🍜 云美食小程序 (yun-food)

基于 **monorepo** 架构的美食小程序全栈项目。

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | uni-app (unibest) + Vue 3 + UnoCSS + uview-plus |
| 后端 | NestJS + Prisma + MySQL |
| 共享 | TypeScript 类型定义 |
| 包管理 | pnpm workspace |

## 项目结构

```
yun/
├── apps/
│   ├── app/                # 前端小程序 (unibest + uview-plus)
│   └── server/             # 后端服务 (NestJS + Prisma)
├── packages/
│   └── shared/             # 前后端共享类型和工具
├── package.json            # monorepo 根配置
├── pnpm-workspace.yaml     # pnpm workspace 配置
└── .gitignore
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- MySQL >= 5.7

### 安装依赖

```bash
pnpm install
```

### 配置数据库

1. 复制环境变量文件并修改数据库连接信息：

```bash
cp apps/server/.env.example apps/server/.env
```

2. 编辑 `apps/server/.env`，填入实际的 MySQL 连接信息。

3. 执行数据库迁移：

```bash
pnpm db:migrate
```

### 启动开发

```bash
# 启动后端服务
pnpm dev:server

# 启动前端（H5 模式）
pnpm dev:app

# 启动前端（微信小程序模式）
pnpm --filter @yun/app dev:mp
```

### 构建

```bash
pnpm build:app      # 构建前端
pnpm build:server   # 构建后端
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev:app` | 启动前端开发（H5） |
| `pnpm dev:server` | 启动后端开发 |
| `pnpm build:app` | 构建前端 |
| `pnpm build:server` | 构建后端 |
| `pnpm type-check:app` | 前端类型检查 |
| `pnpm lint:app` | 前端 lint |
| `pnpm lint:server` | 后端 lint |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm lint` | 全量 lint |

## Git 与提交流程

- 统一只在仓库根目录执行 `git status`、`git add`、`git commit`、`git push`。
- `apps/app` 和 `apps/server` 都由根仓库统一管理，不再单独初始化 git。
- 执行 `pnpm install` 后，根目录 `prepare` 会把 git hooks 指向 `.husky/`。
- 提交前建议在根目录执行对应命令：前端改动用 `pnpm type-check:app` 或 `pnpm lint:app`，后端改动用 `pnpm build:server` 或 `pnpm lint:server`。
- 当前根目录 hooks 会校验 commit message，并在提交包含 `apps/app` 改动时运行前端 `lint-staged`。

## CI 说明

- GitHub Actions 现在只认仓库根目录 `.github/workflows/` 下的配置。
- 原来 `apps/app/.github/` 下的 issue template 和 workflows 已迁移到根目录。
- 原 `deploy.yml` 依赖的 VitePress 并未安装到当前 monorepo，已改为归档文件，避免在根仓库触发一个本来就跑不通的工作流。
*** Add File: /Users/wangchao/Documents/best/yun/.commitlintrc.cjs
module.exports = {
	extends: ['@commitlint/config-conventional'],
}
