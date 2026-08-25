# NeteaseCloudMusicApi Enhanced — Netlify Proxy

透明中转站，将所有请求转发到上游 NCM API 部署：

```
https://netease-cloud-music-api-mauve.vercel.app
```

## 用途

原版 api-enhanced 在 serverless 环境（Netlify Functions）上冷启动时需要刷新 `anonymous_token` + `xeapi public key`，而上游 NCM 的注册接口频繁触发风控，导致 10 秒函数超时。本仓库改为纯中转：不在本地运行 Express，而是把每个请求原样转发到稳定的上游部署（Vercel 实例），由上游处理 token 生命周期，本函数只负责透传。

## 部署

1. Fork 本仓库
2. 在 [Netlify](https://app.netlify.com/) 新建站点，导入 fork 的仓库
3. 构建配置由 `netlify.toml` 自动提供：
   - Build command：空（无构建步骤）
   - Functions directory：`netlify/functions`
   - Node 版本：22
4. Deploy，访问 Netlify 分配的域名即可调用 API

## 验证

```bash
# 首页
curl https://<your-site>.netlify.app/

# 搜索
curl "https://<your-site>.netlify.app/search?keywords=test"

# 歌曲详情
curl "https://<your-site>.netlify.app/song/detail?ids=347230"
```

## 行为说明

- **方法无关**：GET / POST / PUT / DELETE / OPTIONS 全部转发
- **查询字符串**：原样保留（包括重复 key）
- **请求体**：原样转发（支持 JSON / form / multipart / 二进制）
- **请求头**：转发 `Accept`、`Content-Type`、`Cookie`、`User-Agent` 等；未提供 `User-Agent` 时使用通用浏览器 UA
- **响应头**：转发 `Content-Type`、`Set-Cookie`、`Cache-Control`、CORS 头等；`Set-Cookie` 通过 `multiValueHeaders` 透传，保证登录流程的多 cookie 不丢失
- **CORS**：所有响应附加 `Access-Control-Allow-Origin: *` 等 CORS 头；OPTIONS 预检直接返回 204，不命中上游
- **二进制响应**：图片 / 验证码等二进制内容自动 base64 编码返回
- **错误**：上游不可达时返回 `502 {"code":502,"msg":"upstream fetch failed: ..."}`

## 切换上游

修改 `netlify/functions/api.js` 顶部的 `UPSTREAM` 常量即可。
