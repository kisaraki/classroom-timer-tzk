# KOSMOS TOOLKIT（探真拓知酷）

`classroom-timer-tzk` 是一套為教室投影、電子白板與觸控裝置設計的純前端計時工具。首頁品牌為 **KOSMOS TOOLKIT**，副標為「探真拓知酷」。專案無須登入、後端或網路 API，可直接在瀏覽器中使用，也可部署到 GitHub Pages 等靜態網站服務。

線上版本：https://kisaraki.github.io/classroom-timer-tzk/

## 功能

- 即時時鐘：數位時間、日期、指針鐘、電子錶外框，以及四種字型、五種文字顏色與淺灰、黑色、深藍、電子錶四種背景切換。
- 大型碼表：開始、停止、繼續、歸零，以及四種字型、五種文字顏色與淺灰、黑色、深藍、電子錶四種底色。
- 20 組碼表：各組獨立操作，支援點擊數字停止／繼續、全部開始、全部停止、全部歸零與四種字型；七段顯示採用低負載更新策略。
- 倒數計時器：欄位滾輪、上下按鈕、觸控滑動調整、快速加減、水平移動的紅色進度指示線、最後 N 秒背光提醒、多種字型與文字顏色、螢光藍沙漏／純文字模式及選用提示音。
- 全螢幕、鍵盤快捷鍵、手機／平板／投影畫面響應式配置。

碼表與倒數計時器透過 `performance.now()` 計算實際經過時間，以減少長時間執行的累積誤差。

20 組碼表的七段顯示限制為每 50 毫秒更新一次，僅刷新正在運行且數字有變化的組別，並停用每個燈段各自執行的陰影與轉場。這項最佳化只降低畫面重繪負擔，停止或繼續時仍會依實際經過時間顯示精確結果。

## 顯示設定

- 字型：電子錶、新細明體、黑體、打字機。
- 文字顏色：螢光綠、電腦白、琥珀色（`#E6CEA7`）、深紅色、鐵灰色（`#3A3D46`）。
- 背景／底色：淺灰色、黑色、深藍色、電子錶（`#C9CFBF`）。
- 倒數計時器可切換沙漏動畫與純文字模式；沙漏使用螢光藍視覺效果。

## 使用方式

直接開啟根目錄的 `index.html`，或將整個專案放在任一靜態網站服務中。專案不需要建置流程，也不依賴 `node_modules`。

總頁入口與四個功能都有可直接開啟及分享的網址：

| 入口 | 網址 |
| --- | --- |
| 總頁 | https://kisaraki.github.io/classroom-timer-tzk/ |
| 即時時鐘 | https://kisaraki.github.io/classroom-timer-tzk/?tool=clock |
| 大型碼表 | https://kisaraki.github.io/classroom-timer-tzk/?tool=stopwatch |
| 20 組碼表 | https://kisaraki.github.io/classroom-timer-tzk/?tool=multi-stopwatch |
| 倒數計時器 | https://kisaraki.github.io/classroom-timer-tzk/?tool=countdown |

首頁卡片與各功能的「首頁」連結會同步更新網址；瀏覽器上一頁與下一頁也能在總頁及功能之間切換。`?tool=` 路由不需要伺服器重新導向，因此可直接用於 GitHub Pages，並保留單一 `index.html` 的維護架構。

倒數時間停止時可用下列方式設定：

- 將滑鼠移到時、分、秒或百分秒欄位上滾動滾輪。
- 使用各時間欄位上方與下方的按鈕逐格調整。
- 使用 `±5 秒`、`±10 秒`、`±1 分鐘`、`±5 分鐘` 等快速調整按鈕。
- 觸控裝置上，在指定欄位向上或向下滑動。
- 選取欄位後按鍵盤方向鍵上／下。
- 使用畫面上的快速加減按鈕。

提示音預設關閉。開啟後，瀏覽器仍可能依自身的自動播放政策限制聲音。

## 快捷鍵

| 按鍵 | 功能 |
| --- | --- |
| `Space` | 開始／停止 |
| `R` | 歸零 |
| `H` | 回到主選單 |
| `F` | 進入／離開全螢幕 |
| `Esc` | 使用瀏覽器預設行為離開全螢幕 |

游標位於輸入欄位或選單中時，快捷鍵不會介入。

## GitHub Pages 部署

1. 將所有檔案推送到 GitHub 儲存庫。
2. 在儲存庫開啟 **Settings → Pages**。
3. 在 **Build and deployment** 選擇 **Deploy from a branch**。
4. 選擇要發布的分支（通常是 `main`）以及根目錄 `/ (root)`。
5. 儲存後等待 GitHub Pages 完成部署。

總頁入口為根目錄的 `index.html`；四個功能使用 `?tool=` 查詢參數直接進入。CSS 與 JavaScript 均使用相對路徑，且專案包含 `.nojekyll`。

## 檔案結構

```text
classroom-timer-tzk/
├── .gitignore
├── .nojekyll
├── LICENSE
├── README.md
├── index.html
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── clock.js
    ├── stopwatch.js
    ├── multi-stopwatch.js
    └── countdown.js
```

## 字型與授權

本專案沒有載入外部字型、圖片、音訊或 CDN 資源。七段式電子錶數字由 HTML 元素與 CSS `clip-path` 組成，不依賴任何字型檔案；其他文字使用系統字型。提示音由瀏覽器 Web Audio API 即時產生。

## 隱私

本專案不蒐集、傳送或保存學生姓名、班級名單、個人資料與使用紀錄。瀏覽器的 `localStorage` 僅用於保存以下本機偏好：

- 即時時鐘字型、文字顏色、背景色及指針鐘顯示狀態
- 大型碼表字型、文字顏色及背景色
- 20 組碼表字型
- 倒數計時器字型、文字顏色、最後 N 秒提醒、沙漏顯示模式及提示音開關

所有資料皆留在使用者目前的瀏覽器中。
