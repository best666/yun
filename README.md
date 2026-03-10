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
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm lint` | 全量 lint |
