# 婚纱摄影级高级感 · 生日时光纪念站 v4 开发记录

## 目标
为妻子（2000-05-31，2026年满26岁）打造永久生日时光纪念站，对标国内TOP级婚纱摄影官网视觉规范。

## 完成时间
2026-05-03 13:44 GMT+8

## 开发步骤与产出

| 步骤 | 文件 | 大小 | 状态 |
|------|------|------|------|
| 1. 停旧服务 | — | — | ✅ |
| 2. server.js | server.js | 15KB | ✅ |
| 3. index.html | public/index.html | 7.5KB | ✅ |
| 4. style.css | public/css/style.css | 19KB | ✅ |
| 5. app.js | public/js/app.js | 15.5KB | ✅ |
| 6. year.html | public/year.html | 11.6KB | ✅ |
| 7. admin.html | public/admin.html | 14KB | ✅ |
| 8. 重启验证 | — | — | ✅ 全部通过 |
| 9. 部署文档 | README.md | 5.7KB | ✅ |

## 核心设计规范
- **配色**：奶白 #F8F6F4 / 香槟金 #D4C2A8 / 柔灰粉 #E8DFE0 / 深棕灰 #3A3A3A
- **辅助色**：柔雾紫 #E2D9E3 / 浅卡其 #EBE6DE
- **字体**：Noto Serif SC，标题300字重，正文400字重，行高1.75
- **圆角**：卡片12px，按钮16px
- **动画**：0.6s ease-out，无夸张特效
- **边距**：左右8%屏幕宽度

## 8大板块
1. 全屏开场首屏 — 打字机标题 + 实时生命时钟 + 进入按钮
2. 我们的专属纪念日 — 3张磨砂玻璃卡片（初见/相恋/余生）
3. 当年生日主场 — 可编辑寄语 + 照片网格 + 上传
4. 历年生日时光馆 — 26张年份卡片，点击进入独立页面
5. 萌宠家族 — 6张宠物卡片（猫3 + 蜜袋鼯3）
6. 公共祝福墙 — 无需登录，瀑布流卡片 + 弹幕
7. 时光补全计划 — 好友上传照片/故事，需审核
8. 页脚暖心寄语

## 技术架构
- 后端：Node.js 原生 HTTP，零依赖，端口3000
- 前端：纯 HTML/CSS/JS，无框架
- 数据：JSON 文件持久化（data/ 目录）
- 上传：multipart 手动解析，存 public/uploads/
- 粒子：Canvas 金色尘埃效果
- 弹幕：CSS animation + JS 定时生成

## API 端点（全部验证通过）
- GET/POST/DELETE /api/blessings
- GET/POST/DELETE /api/photos
- GET/POST/DELETE /api/pending + POST /api/pending/approve/:id
- GET/POST /api/year/:age/stories
- GET/POST /api/year/:age/photos

## 修复记录
- readJSON 函数边界情况：文件不存在时 catch 内二次读取导致 500 错误，改为先 existsSync 检查

## 管理后台
- 密码：gxy05310
- 功能：总览 / 待审核 / 祝福管理 / 照片管理

## 部署
- 本地：`node server.js` → localhost:3000
- 公网：`npx localtunnel --port 3000`
- 启动脚本：start.bat / start-public.bat
