# Zixulu CLI

一个功能丰富的前端开发工具集。

## 使用说明

### 项目初始化相关

- `zixulu init` - 初始化项目
- `zixulu eslint` - 删除 ESLint 相关配置
- `zixulu prettier` - 添加 prettier 配置
- `zixulu gitignore` - 添加 .gitignore 配置

### 构建工具配置

- `zixulu vite` - 初始化 vite 配置
- `zixulu rsbuild` - 初始化 rsbuild 配置
- `zixulu next` - 初始化 next 配置
- `zixulu father` (别名: `fs`) - 初始化 father 项目配置
- `zixulu rollup` - rollup 打包配置

### 样式工具

- `zixulu tailwind` - 添加 tailwind 配置
- `zixulu tailwind-patch` (别名: `tp`) - 应用 tailwind 补丁
- `zixulu antd` - 添加 antd 配置

### 依赖管理

- `zixulu upgrade-dependency` (别名: `ud`) - 升级项目依赖
- `zixulu upgrade-workspace-dependency` (别名: `uwd`) - 升级工作区项目依赖
- `zixulu registry` - 设置 npm registry
- `zixulu reinstall` (别名: `ri`) - 重新安装依赖
- `zixulu pnpm` - 设置 pnpm 配置
- `zixulu remove-lock` (别名: `rl`) - 删除 lock 文件

### 代码转换

- `zixulu remove-comment <path>` - 删除文件注释
- `zixulu arrow-to-function` (别名: `a2f`) - 将箭头函数组件转换为函数组件
- `zixulu interface-to-type` (别名: `i2t`) - 将 interface 转换为 type
- `zixulu sort-package-json` (别名: `spj`) - 对 package.json 中的依赖进行排序
- `zixulu add-alias` (别名: `aa`) - 添加路径别名
- `zixulu replace-alias` (别名: `ra`) - 替换路径别名

### 开发工具

- `zixulu vscode` (别名: `vsc`) - 同步 VS Code 配置
- `zixulu kill-port <port>` - 根据端口号杀死进程
- `zixulu snippet <path>` (别名: `sn`) - 生成 vscode snippet
- `zixulu browserlistrc` (别名: `blr`) - 添加 browserlistrc 配置
- `zixulu tsc` - 运行类型检查

### 代理设置

- `zixulu git-proxy` (别名: `gp`) - 设置 git 代理
- `zixulu shell-proxy` (别名: `sp`) - 设置 Shell 代理

### 数据库相关

- `zixulu prisma` - 添加 prisma 配置
- `zixulu prisma-generate` (别名: `pg`) - 生成 prisma client

### Docker 相关

- `zixulu install-docker` (别名: `id`) - 安装 Docker
- `zixulu set-docker-registry` (别名: `sdr`) - 设置 Docker 镜像地址

### 其他工具

- `zixulu beta-version` (别名: `bv`) - 设置版本号
- `zixulu headers` - 将浏览器中直接复制的 headers 转换为对象
- `zixulu add-zip-dist` (别名: `azd`) - 添加将 dist 压缩的脚本
- `zixulu bun` - 设置 bun
- `zixulu add-sync` - 添加同步包脚本

## 选项

许多命令支持以下选项：

- `-r, --registry <registry>` - 指定 npm 源地址(npm/taobao/tencent)
- `-p, --proxy` - 是否使用代理
- 更多选项请查看具体命令的帮助信息

## 代理配置

如果需要配置代理，可以通过以下命令：

```bash
# 设置 Git 代理
zixulu gp

# 设置 Shell 代理
zixulu sp
```

## License

MIT
