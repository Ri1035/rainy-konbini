# 雨夜便利店 · 街角微缩场景

一个**单文件、可双击打开**的三维微缩景观：日式便利店街角，雨夜，三渲二（卡通渲染）。
第三人称自由观看——拖拽旋转、滚轮缩放、右键/双指平移，无任何 UI 元素。

- 线上预览（Cloudflare Pages）：https://rainy-konbini.pages.dev
- 仓库：https://github.com/Ri1035/rainy-konbini

## 交付物

| 文件 | 说明 |
| --- | --- |
| `index.html` | **本地版成品**。自包含单文件（约 613 KB，three.js 已内联），双击即可在浏览器打开 |
| `dist/` | **部署版产物**（`index.html` + `assets/app.js` + `_headers`）。拆分后 HTML 极小、JS 可长期缓存 |
| `src/` | 源码（source of truth）。改这里的文件，再重新构建 |
| `build.mjs` | 构建脚本：一次产出上面两种形态 |
| `preview/` | 多角度效果图 |
| `.devtools/` | 本地验证脚本（截图 / 突破网络限制的推送辅助），不参与构建、不提交 |

## 重新构建

```bash
npm install          # 首次
node build.mjs       # 同时生成 index.html（单文件）与 dist/（拆分）
```

## 重新部署到 Cloudflare Pages

```bash
# 首次：创建项目（之后可跳过）
curl -X POST -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"rainy-konbini","production_branch":"main"}' \
  https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects

# 每次发布
CLOUDFLARE_API_TOKEN=$CF_TOKEN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID CI=1 \
  npx --yes wrangler@3 pages deploy dist --project-name=rainy-konbini --branch=main --commit-dirty=true
```

> 国内网络下若 `github.com` 无法解析（加速器改写过 hosts），可参考 `.devtools/push.cjs`：
> 进程内起一个 CONNECT 代理，把域名映射到实测可直连的真实 IP 后再 `git push`。

## 源码结构

```
src/
  main.js        渲染器 / 相机 / 轨道控制 / 灯光 / 后期（Bloom + 调色 + 暗角）/ 主循环
  layout.js      全场布局常量（底座、店铺轮廓、街道、人行道、后巷、停车场）—— 改形先看这里
  ground.js      底座台座、沥青路面（半透明覆层 + 镜面反射层 = 积水反光）、斑马线、排水沟、停车位
  store.js       便利店：外墙、玻璃幕墙、自动门、招牌、雨棚、完整店内陈设与店内灯光
  props.js       街景道具：自动贩卖机、自行车、路灯、电线杆与电线、路牌、护栏、垃圾桶、
                 雨伞架、公告栏、凸面镜、横幅旗、后场杂物
  neighbors.js   西侧邻栋（小酒馆 + 霓虹招牌）、后巷细节、北侧围墙、树篱围合、街道对面楼体
  lib/
    core.js      调色板、程序化贴图（canvas 生成：招牌 / 商品 / 海报 / 地面…）、
                 三渲二材质、描边（反向外壳）、地面涟漪着色器、构件工厂
    atmos.js     雨（实例化雨丝 + 溅落）、天空穹顶、环境反射捕捉
```

## 技术要点

- **三渲二**：`MeshToonMaterial` + 4 段 gradientMap；反向外壳描边（沿法线外扩，屏幕宽度近似恒定）。
- **湿滑地面**：底层 `Reflector` 镜面 + 上层半透明沥青（alphaMap 控制积水区域透出镜面）+ 加色反光条。
- **店内明亮**：大面积自发光面 + 低强度暖色点光 + 商品贴图，与室外形成明暗与色温对比。
- **雨**：GPU 实例化雨丝（视图空间恒宽），雨区自动避开店铺与雨棚投影范围。
- **后期**：UnrealBloom（阈值 0.80）+ 调色（对比 / 饱和 / 冷调暗部 / 暗角）+ ACES 色调映射。
- **自适应画质**：帧率不足时自动降采样，仍不足则关闭镜面反射层。

## 常用调整位置

- 取景：`src/main.js` 中 `HOME`（方位角 / 仰角 / 距离）
- 亮度：`src/main.js` 中 `toneMappingExposure`、`hemi`、`moon`、`bloom`
- 氛围：`src/main.js` 中 `scene.fog`、`GradeShader`
- 店铺尺寸：`src/layout.js` 中 `STORE`
- 画质档位：`src/main.js` 中 `TIER_CFG`（像素比 / 点数抗锯齿 / 反射分辨率 / 雨量 / 阴影 / 像素预算）

## 性能（在 NVIDIA GT 710 这类入门独显上实测）

| 指标 | 优化前 | 优化后 |
| --- | --- | --- |
| 从打开到出画 | 7.7 s | **3.7 s** |
| 帧率 | ~20 fps | **~46 fps** |
| 帧时间 p50 / p90 | 46 / 50 ms | **22 / 26 ms** |
| 每帧 draw call | 1260 | **315** |
| 场景网格数 | 1902 | **287** |
| 点光源数 | 18 | **10** |

做法（都在源码里，可按需回退）：
1. **静态几何合并**（`src/lib/optimize.js`）：把 1902 个静态网格按「材质 + renderOrder」烘焙世界变换后合并成 255 个网格，描边统一合并为 1 批；雨/光晕/反光条/闪烁灯等动态对象自动排除。
2. **材质实例去重**（`src/lib/core.js`）：`toon / glow / litMap` 同参数复用同一材质，否则合并后仍会有数百个批次。
3. **阴影只渲一次**：场景静态，`shadowMap.autoUpdate = false`；低端卡直接关闭阴影（省掉逐片元采样与一大截着色器编译时间）。
4. **镜面反射按档位降规格 + 降频更新**：低端卡 256² 每 6 帧更新一次，肉眼几乎无差别。
5. **着色器异步编译**：`renderer.compileAsync` 放在开画之前，加载过程不再卡死数秒。
6. **点光源削减**：18 → 10；每个材质片元都要循环计算所有点光源，这是低端卡的大头。
7. **环境反射捕捉**跳过「屋顶高度以下且非自发光」的物体（屋面保留，避免从上方看穿店内）。
8. **自适应画质阶梯** + 像素预算：帧率不足时依次降采样 → 缩小 Bloom → 关镜面 → 减雨量 → 关 Bloom；有余量会自动回升，预热期（前 3 秒）不判定，避免误降。

## 调试钩子（无 UI，仅控制台可用）

```js
window.__view(az, el, dist)  // 指定机位（弧度 / 弧度 / 距离）
window.__home()              // 回到默认机位
window.__perf()              // 帧率、draw call、合并统计、加载分段计时、显卡型号
window.__scene / __camera / __renderer
```
