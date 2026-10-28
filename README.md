# 任务参与统计

内部使用的任务参与次数统计站：管理员批量上传 Excel（含凭证图片或图片超链接），系统按基准图数换算参与次数，支持 ID 查询、排行榜、账号关联、汇总编辑与导出。

技术栈：Next.js 14（App Router）+ TypeScript + SQLite（better-sqlite3）+ exceljs + Tailwind CSS。

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

- 数据目录默认：`./data`（自动创建 `app.db` 与 `uploads/`）
- 管理员密码默认：`Lyt19951223`（可用环境变量 `ADMIN_PASSWORD` 覆盖）
- 前台右上角齿轮 → 输入密码进入 `/admin`

生产本地构建：

```bash
# Windows PowerShell 示例
$env:DATA_DIR="D:\大屏统计\data"; npm run build; npm start
```

## 目录结构

```
/app            页面与 API
/lib            db / paths / excel / summary / auth
/data           运行时数据（gitignore，勿提交）
/demo           示例 Excel
/public
Dockerfile
```

## 阿里云轻量服务器部署（IP 直连 · 端口 3000）

短期内部使用（约 1.5 个月），**不购买域名、不做 ICP 备案**，通过 `http://公网IP:3000` 访问。选用高位端口 3000，避免运营商对 80/443 的备案阻断。

当前为 **HTTP + 公网 IP**，无 HTTPS。浏览器若提示「不安全」属预期，可继续访问。

### 五步清单

1. **创建实例**：阿里云轻量应用服务器（2 核 4G 足够），镜像选 Docker 或自行安装 Docker，记下公网 IP。
2. **放行端口**：安全组 / 防火墙入方向放行 TCP `3000`。
3. **上传代码**：`git clone` 或 `scp` 到服务器项目目录。
4. **构建并运行**（务必挂载数据卷）：

```bash
docker build -t task-stats .
docker run -d --name task-stats \
  -p 3000:3000 \
  -v /opt/task-stats-data:/data \
  -e ADMIN_PASSWORD=Lyt19951223 \
  -e DATA_DIR=/data \
  --restart unless-stopped \
  task-stats
```

> **务必使用 `-v /opt/task-stats-data:/data`**。不挂载则容器重建后数据库与凭证图片全部丢失。

5. **访问验证**：手机与电脑打开 `http://公网IP:3000`，按验收清单自测。

### 数据备份

全部数据在宿主机 `/opt/task-stats-data`（`app.db` + `uploads/`）。定期打包下载即可；后台「下载汇总表」也可作轻量备份。

（可选）如需 HTTPS：可为纯 IP 申请免费证书，再用 Nginx 反代 3000，非必需。

## 环境变量

见 [`.env.example`](.env.example)：

| 变量 | 说明 | 默认 |
|------|------|------|
| `ADMIN_PASSWORD` | 管理员密码 | `Lyt19951223` |
| `DATA_DIR` | 数据根目录 | 本地 `./data`；Docker `/data` |
| `PORT` | 监听端口 | `3000` |

## 实现决策记录

1. **示例 Excel**（`/demo/sample.xlsx`）：第一个 sheet 为明细；R1 为合并标题，R2 为表头（`序号|昵称|请上传图片…`）。表头启发式要求「非空且去重后 ≥ 2 格」，避免把合并标题当成表头。
2. **用户列**：匹配 `/id|用户|账号|姓名|昵称|学号|工号|人员/i`；本示例命中「昵称」。
3. **任务名列**：示例无任务列 → 使用上传弹窗指定的任务名（文件名或自定义）。
4. **图片来源**：优先 `worksheet.getImages()` 内嵌图；示例文件无内嵌图，图片以**单元格超链接**形式存在 → 解析时下载并计入 `image_count`（下载失败仍计次，保证次数算法正确）。
5. **无图任务**：`base = 0`，每行 `times = 1`。
6. **鉴权**：登录返回固定 token `admin-ok`，前端 `sessionStorage`，写接口校验 `x-admin-token`；无 Cookie / JWT / 中间件。
7. **请求路径**：一律相对路径（`/api/...`），便于日后换域名零改动。
8. **仅解析 workbook 第一个 worksheet**。

## 常用验收

- `npm run dev` 首访自动建库建表
- 上传 Excel → 汇总 / 查询 / 排行 / 关联 / 编辑 / 导出
- 覆盖同名任务不重复累加
- 手机卡片布局 + 上传全屏抽屉
- `docker restart` 后数据仍在（验证 volume）
