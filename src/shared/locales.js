'use strict';

/**
 * 共享 i18n 模块。
 * 主进程（Node 侧）与渲染层（经 preload 注入）共用同一份译文与解析逻辑。
 * 支持的 5 种语言：简体中文 / 繁体中文 / 英语 / 日语 / 韩语。
 * 全部为左到右书写（LTR），无需 RTL 镜像。
 */

// 受支持的语言列表（顺序即下拉展示顺序）
const LOCALES = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'];

// 各语言的「自称呼称」（端称，始终用本族语展示）
const LOCALE_LABELS = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어'
};

// 译文表（扁平键值）。缺失时回退简体中文，再回退 key 本身。
const messages = {
  'zh-CN': {
    'app.name': '桌面便签',
    'tray.newNote': '新建便签',
    'tray.newTextNote': '新建文本便签',
    'tray.newWebNote': '新建网页便签',
    'tray.openMainWindow': '打开主窗口',
    'tray.lockAll': '全部锁定',
    'tray.unlockAll': '全部解锁',
    'tray.showAll': '全部显示',
    'tray.hideAll': '全部隐藏',
    'tray.quit': '退出',
    'tray.tooltip': '桌面便签',
    'dlg.image': '图片',

    'config.subtitle': '主窗口',
    'config.calibrate': '校准',
    'config.calibrateTip': '重新校准所有便签到屏幕可见区',
    'config.globalConfig': '全局配置',
    'config.newNote': '+ 新建便签',
    'config.newTextNote': '新建文本便签',
    'config.newWebNote': '新建网页便签',
    'config.searchPlaceholder': '搜索便签…',
    'config.sortUpdated': '最近更新',
    'config.sortCreated': '创建时间',
    'config.sortSize': '字号',
    'config.myNotes': '我的便签',
    'config.emptyTitle': '还没有便签',
    'config.emptyHint': '点上方「+ 新建便签」开始',
    'config.emptyNoMatch': '没有匹配的便签',
    'config.emptyNoMatchHint': '换个关键词试试',
    'config.menuConfig': '配置便签',
    'config.menuDup': '复制',
    'config.menuToggleHide': '隐藏 / 显示',
    'config.menuToggleLock': '锁定 / 解锁',
    'config.menuDelete': '删除',
    'config.moreActions': '更多操作',
    'config.webNote': '网页便签',
    'config.emptyNote': '空便签',
    'config.noUrl': '未设置网址',
    'config.emptyContent': '（空内容）',
    'config.hidden': '已隐藏',
    'config.shown': '显示中',
    'config.confirmDelete': '确定删除这条便签？此操作不可撤销。',
    'config.chars': '{n} 字',
    'config.justNow': '刚刚',
    'config.minutesAgo': '{n} 分钟前',
    'config.hoursAgo': '{n} 小时前',
    'config.daysAgo': '{n} 天前',

    'note.drag': '拖动',
    'note.bold': '加粗',
    'note.italic': '斜体',
    'note.list': '列表',
    'note.link': '链接',
    'note.image': '插入图片',
    'note.textColor': '文字色',
    'note.lock': '锁定',
    'note.done': '完成',
    'note.urlPlaceholder': '输入网址，如 https://…',
    'note.go': '前往',
    'note.reload': '刷新',
    'note.linkPrompt': '输入链接地址：',

    'noteConfig.type': '类型',
    'noteConfig.title': '配置便签',
    'noteConfig.textNote': '文本便签',
    'noteConfig.webNote': '网页便签',
    'noteConfig.display': '所在屏幕',
    'noteConfig.posSize': '尺寸与坐标',
    'noteConfig.x': 'X',
    'noteConfig.y': 'Y',
    'noteConfig.width': '宽',
    'noteConfig.height': '高',
    'noteConfig.appearance': '外观',
    'noteConfig.background': '背景',
    'noteConfig.text': '文字',
    'noteConfig.fontSize': '字号',
    'noteConfig.opacity': '透明度',
    'noteConfig.behavior': '行为',
    'noteConfig.hide': '隐藏',
    'noteConfig.alwaysOnTop': '置顶',
    'noteConfig.lock': '锁定',
    'noteConfig.lockHint': '锁定后便签点击穿透，仅可在此配置',
    'noteConfig.locate': '显示位置',
    'noteConfig.reset': '重置',
    'noteConfig.delete': '删除',
    'noteConfig.close': '关闭',
    'noteConfig.resetConfirm': '重置外观为默认值？',
    'noteConfig.deleteConfirm': '确定删除这条便签？此操作不可撤销。',

    'globalConfig.launchOnStartup': '开机启动',
    'globalConfig.launchDesc': '登录 Windows 后自动运行桌面便签',
    'globalConfig.theme': '主题',
    'globalConfig.themeLight': '浅色',
    'globalConfig.themeDark': '深色',
    'globalConfig.themeSystem': '跟随系统',
    'globalConfig.themeHint': '切换后所有配置窗口即时生效',
    'globalConfig.defaults': '新便签默认值',
    'globalConfig.defaultFontSize': '默认字号',
    'globalConfig.defaultFontSizeDesc': '新建文本便签的初始字号',
    'globalConfig.defaultOpacity': '默认透明度',
    'globalConfig.defaultOpacityDesc': '新建便签的初始透明度',
    'globalConfig.defaultBg': '默认背景色',
    'globalConfig.defaultText': '默认文字色',
    'globalConfig.savedHint': '设置即时保存',
    'globalConfig.title': '全局配置',
    'globalConfig.language': '语言',
    'globalConfig.langAuto': '自动（跟随系统）',

    'display.label': '屏幕 {n}',
    'display.primary': '（主）'
  },

  'zh-TW': {
    'app.name': '桌面便簽',
    'tray.newNote': '新建便簽',
    'tray.newTextNote': '新建文字便簽',
    'tray.newWebNote': '新建網頁便簽',
    'tray.openMainWindow': '開啟主視窗',
    'tray.lockAll': '全部鎖定',
    'tray.unlockAll': '全部解鎖',
    'tray.showAll': '全部顯示',
    'tray.hideAll': '全部隱藏',
    'tray.quit': '結束',
    'tray.tooltip': '桌面便簽',
    'dlg.image': '圖片',

    'config.subtitle': '主視窗',
    'config.calibrate': '校正',
    'config.calibrateTip': '重新校正所有便簽到螢幕可見區',
    'config.globalConfig': '全域設定',
    'config.newNote': '+ 新建便簽',
    'config.newTextNote': '新建文字便簽',
    'config.newWebNote': '新建網頁便簽',
    'config.searchPlaceholder': '搜尋便簽…',
    'config.sortUpdated': '最近更新',
    'config.sortCreated': '建立時間',
    'config.sortSize': '字號',
    'config.myNotes': '我的便簽',
    'config.emptyTitle': '還沒有便簽',
    'config.emptyHint': '點上方「+ 新建便簽」開始',
    'config.emptyNoMatch': '沒有符合的便簽',
    'config.emptyNoMatchHint': '換個關鍵字試試',
    'config.menuConfig': '設定便簽',
    'config.menuDup': '複製',
    'config.menuToggleHide': '隱藏 / 顯示',
    'config.menuToggleLock': '鎖定 / 解鎖',
    'config.menuDelete': '刪除',
    'config.moreActions': '更多操作',
    'config.webNote': '網頁便簽',
    'config.emptyNote': '空便簽',
    'config.noUrl': '未設定網址',
    'config.emptyContent': '（空內容）',
    'config.hidden': '已隱藏',
    'config.shown': '顯示中',
    'config.confirmDelete': '確定刪除這條便簽？此操作不可撤銷。',
    'config.chars': '{n} 字',
    'config.justNow': '剛剛',
    'config.minutesAgo': '{n} 分鐘前',
    'config.hoursAgo': '{n} 小時前',
    'config.daysAgo': '{n} 天前',

    'note.drag': '拖動',
    'note.bold': '加粗',
    'note.italic': '斜體',
    'note.list': '清單',
    'note.link': '連結',
    'note.image': '插入圖片',
    'note.textColor': '文字色',
    'note.lock': '鎖定',
    'note.done': '完成',
    'note.urlPlaceholder': '輸入網址，如 https://…',
    'note.go': '前往',
    'note.reload': '重新整理',
    'note.linkPrompt': '輸入連結位址：',

    'noteConfig.type': '類型',
    'noteConfig.title': '設定便簽',
    'noteConfig.textNote': '文字便簽',
    'noteConfig.webNote': '網頁便簽',
    'noteConfig.display': '所在螢幕',
    'noteConfig.posSize': '尺寸與座標',
    'noteConfig.x': 'X',
    'noteConfig.y': 'Y',
    'noteConfig.width': '寬',
    'noteConfig.height': '高',
    'noteConfig.appearance': '外觀',
    'noteConfig.background': '背景',
    'noteConfig.text': '文字',
    'noteConfig.fontSize': '字號',
    'noteConfig.opacity': '透明度',
    'noteConfig.behavior': '行為',
    'noteConfig.hide': '隱藏',
    'noteConfig.alwaysOnTop': '置頂',
    'noteConfig.lock': '鎖定',
    'noteConfig.lockHint': '鎖定後便簽點擊穿透，僅可在此設定',
    'noteConfig.locate': '顯示位置',
    'noteConfig.reset': '重設',
    'noteConfig.delete': '刪除',
    'noteConfig.close': '關閉',
    'noteConfig.resetConfirm': '重設外觀為預設值？',
    'noteConfig.deleteConfirm': '確定刪除這條便簽？此操作不可撤銷。',

    'globalConfig.launchOnStartup': '開機啟動',
    'globalConfig.launchDesc': '登入 Windows 後自動執行桌面便簽',
    'globalConfig.theme': '主題',
    'globalConfig.themeLight': '淺色',
    'globalConfig.themeDark': '深色',
    'globalConfig.themeSystem': '跟隨系統',
    'globalConfig.themeHint': '切換後所有設定視窗即時生效',
    'globalConfig.defaults': '新便簽預設值',
    'globalConfig.defaultFontSize': '預設字號',
    'globalConfig.defaultFontSizeDesc': '新建文字便簽的初始字號',
    'globalConfig.defaultOpacity': '預設透明度',
    'globalConfig.defaultOpacityDesc': '新建便簽的初始透明度',
    'globalConfig.defaultBg': '預設背景色',
    'globalConfig.defaultText': '預設文字色',
    'globalConfig.savedHint': '設定即時儲存',
    'globalConfig.title': '全域設定',
    'globalConfig.language': '語言',
    'globalConfig.langAuto': '自動（跟隨系統）',

    'display.label': '螢幕 {n}',
    'display.primary': '（主）'
  },

  'en': {
    'app.name': 'Desktop Notes',
    'tray.newNote': 'New note',
    'tray.newTextNote': 'New text note',
    'tray.newWebNote': 'New web note',
    'tray.openMainWindow': 'Open main window',
    'tray.lockAll': 'Lock all',
    'tray.unlockAll': 'Unlock all',
    'tray.showAll': 'Show all',
    'tray.hideAll': 'Hide all',
    'tray.quit': 'Quit',
    'tray.tooltip': 'Desktop Notes',
    'dlg.image': 'Images',

    'config.subtitle': 'Main window',
    'config.calibrate': 'Calibrate',
    'config.calibrateTip': 'Recalibrate all notes to the visible screen area',
    'config.globalConfig': 'Global settings',
    'config.newNote': '+ New note',
    'config.newTextNote': 'New text note',
    'config.newWebNote': 'New web note',
    'config.searchPlaceholder': 'Search notes…',
    'config.sortUpdated': 'Recently updated',
    'config.sortCreated': 'Created time',
    'config.sortSize': 'Font size',
    'config.myNotes': 'My notes',
    'config.emptyTitle': 'No notes yet',
    'config.emptyHint': 'Click “+ New note” above to start',
    'config.emptyNoMatch': 'No matching notes',
    'config.emptyNoMatchHint': 'Try a different keyword',
    'config.menuConfig': 'Configure note',
    'config.menuDup': 'Duplicate',
    'config.menuToggleHide': 'Hide / Show',
    'config.menuToggleLock': 'Lock / Unlock',
    'config.menuDelete': 'Delete',
    'config.moreActions': 'More actions',
    'config.webNote': 'Web note',
    'config.emptyNote': 'Empty note',
    'config.noUrl': 'URL not set',
    'config.emptyContent': '(empty)',
    'config.hidden': 'Hidden',
    'config.shown': 'Visible',
    'config.confirmDelete': 'Delete this note? This cannot be undone.',
    'config.chars': '{n} chars',
    'config.justNow': 'Just now',
    'config.minutesAgo': '{n} min ago',
    'config.hoursAgo': '{n} hr ago',
    'config.daysAgo': '{n} days ago',

    'note.drag': 'Drag',
    'note.bold': 'Bold',
    'note.italic': 'Italic',
    'note.list': 'List',
    'note.link': 'Link',
    'note.image': 'Insert image',
    'note.textColor': 'Text color',
    'note.lock': 'Lock',
    'note.done': 'Done',
    'note.urlPlaceholder': 'Enter URL, e.g. https://…',
    'note.go': 'Go',
    'note.reload': 'Reload',
    'note.linkPrompt': 'Enter link URL:',

    'noteConfig.type': 'Type',
    'noteConfig.title': 'Configure note',
    'noteConfig.textNote': 'Text note',
    'noteConfig.webNote': 'Web note',
    'noteConfig.display': 'Screen',
    'noteConfig.posSize': 'Size & position',
    'noteConfig.x': 'X',
    'noteConfig.y': 'Y',
    'noteConfig.width': 'Width',
    'noteConfig.height': 'Height',
    'noteConfig.appearance': 'Appearance',
    'noteConfig.background': 'Background',
    'noteConfig.text': 'Text',
    'noteConfig.fontSize': 'Font size',
    'noteConfig.opacity': 'Opacity',
    'noteConfig.behavior': 'Behavior',
    'noteConfig.hide': 'Hide',
    'noteConfig.alwaysOnTop': 'Always on top',
    'noteConfig.lock': 'Lock',
    'noteConfig.lockHint': 'When locked, the note is click-through; configure only here',
    'noteConfig.locate': 'Show location',
    'noteConfig.reset': 'Reset',
    'noteConfig.delete': 'Delete',
    'noteConfig.close': 'Close',
    'noteConfig.resetConfirm': 'Reset appearance to defaults?',
    'noteConfig.deleteConfirm': 'Delete this note? This cannot be undone.',

    'globalConfig.launchOnStartup': 'Launch at startup',
    'globalConfig.launchDesc': 'Run Desktop Notes automatically after signing in to Windows',
    'globalConfig.theme': 'Theme',
    'globalConfig.themeLight': 'Light',
    'globalConfig.themeDark': 'Dark',
    'globalConfig.themeSystem': 'System',
    'globalConfig.themeHint': 'Applies to all config windows immediately',
    'globalConfig.defaults': 'New note defaults',
    'globalConfig.defaultFontSize': 'Default font size',
    'globalConfig.defaultFontSizeDesc': 'Initial font size for new text notes',
    'globalConfig.defaultOpacity': 'Default opacity',
    'globalConfig.defaultOpacityDesc': 'Initial opacity for new notes',
    'globalConfig.defaultBg': 'Default background',
    'globalConfig.defaultText': 'Default text color',
    'globalConfig.savedHint': 'Settings are saved instantly',
    'globalConfig.title': 'Global settings',
    'globalConfig.language': 'Language',
    'globalConfig.langAuto': 'Auto (follow system)',

    'display.label': 'Screen {n}',
    'display.primary': '(primary)'
  },

  'ja': {
    'app.name': 'デスクトップ付箋',
    'tray.newNote': '新規付箋',
    'tray.newTextNote': '新規テキスト付箋',
    'tray.newWebNote': '新規ウェブ付箋',
    'tray.openMainWindow': 'メインウィンドウを開く',
    'tray.lockAll': 'すべてロック',
    'tray.unlockAll': 'すべてロック解除',
    'tray.showAll': 'すべて表示',
    'tray.hideAll': 'すべて非表示',
    'tray.quit': '終了',
    'tray.tooltip': 'デスクトップ付箋',
    'dlg.image': '画像',

    'config.subtitle': 'メインウィンドウ',
    'config.calibrate': '位置調整',
    'config.calibrateTip': 'すべての付箋を画面の表示領域に再配置',
    'config.globalConfig': '全体設定',
    'config.newNote': '+ 新規付箋',
    'config.newTextNote': '新規テキスト付箋',
    'config.newWebNote': '新規ウェブ付箋',
    'config.searchPlaceholder': '付箋を検索…',
    'config.sortUpdated': '最近更新',
    'config.sortCreated': '作成日時',
    'config.sortSize': '文字サイズ',
    'config.myNotes': 'マイ付箋',
    'config.emptyTitle': '付箋はまだありません',
    'config.emptyHint': '上の「+ 新規付箋」で作成',
    'config.emptyNoMatch': '一致する付箋がありません',
    'config.emptyNoMatchHint': '別のキーワードをお試しください',
    'config.menuConfig': '付箋を設定',
    'config.menuDup': '複製',
    'config.menuToggleHide': '非表示 / 表示',
    'config.menuToggleLock': 'ロック / ロック解除',
    'config.menuDelete': '削除',
    'config.moreActions': 'その他',
    'config.webNote': 'ウェブ付箋',
    'config.emptyNote': '空の付箋',
    'config.noUrl': 'URL未設定',
    'config.emptyContent': '(空)',
    'config.hidden': '非表示',
    'config.shown': '表示中',
    'config.confirmDelete': 'この付箋を削除しますか？元に戻せません。',
    'config.chars': '{n} 文字',
    'config.justNow': 'たった今',
    'config.minutesAgo': '{n} 分前',
    'config.hoursAgo': '{n} 時間前',
    'config.daysAgo': '{n} 日前',

    'note.drag': 'ドラッグ',
    'note.bold': '太字',
    'note.italic': '斜体',
    'note.list': 'リスト',
    'note.link': 'リンク',
    'note.image': '画像を挿入',
    'note.textColor': '文字色',
    'note.lock': 'ロック',
    'note.done': '完了',
    'note.urlPlaceholder': 'URLを入力（例: https://…）',
    'note.go': '移動',
    'note.reload': '再読み込み',
    'note.linkPrompt': 'リンクURLを入力:',

    'noteConfig.type': '種類',
    'noteConfig.title': '付箋の設定',
    'noteConfig.textNote': 'テキスト付箋',
    'noteConfig.webNote': 'ウェブ付箋',
    'noteConfig.display': '画面',
    'noteConfig.posSize': 'サイズと位置',
    'noteConfig.x': 'X',
    'noteConfig.y': 'Y',
    'noteConfig.width': '幅',
    'noteConfig.height': '高さ',
    'noteConfig.appearance': '外観',
    'noteConfig.background': '背景',
    'noteConfig.text': '文字',
    'noteConfig.fontSize': '文字サイズ',
    'noteConfig.opacity': '不透明度',
    'noteConfig.behavior': '動作',
    'noteConfig.hide': '非表示',
    'noteConfig.alwaysOnTop': '常に最前面',
    'noteConfig.lock': 'ロック',
    'noteConfig.lockHint': 'ロックすると付箋はクリックを通過し、ここでのみ設定可能',
    'noteConfig.locate': '位置を表示',
    'noteConfig.reset': 'リセット',
    'noteConfig.delete': '削除',
    'noteConfig.close': '閉じる',
    'noteConfig.resetConfirm': '外観を既定値にリセットしますか？',
    'noteConfig.deleteConfirm': 'この付箋を削除しますか？元に戻せません。',

    'globalConfig.launchOnStartup': '起動時に実行',
    'globalConfig.launchDesc': 'Windowsにサインイン後、デスクトップ付箋を自動実行',
    'globalConfig.theme': 'テーマ',
    'globalConfig.themeLight': 'ライト',
    'globalConfig.themeDark': 'ダーク',
    'globalConfig.themeSystem': 'システム',
    'globalConfig.themeHint': '切り替えはすべての設定ウィンドウに即時反映',
    'globalConfig.defaults': '新規付箋の既定値',
    'globalConfig.defaultFontSize': '既定の文字サイズ',
    'globalConfig.defaultFontSizeDesc': '新規テキスト付箋の初期文字サイズ',
    'globalConfig.defaultOpacity': '既定の不透明度',
    'globalConfig.defaultOpacityDesc': '新規付箋の初期不透明度',
    'globalConfig.defaultBg': '既定の背景色',
    'globalConfig.defaultText': '既定の文字色',
    'globalConfig.savedHint': '設定は即時保存されます',
    'globalConfig.title': '全体設定',
    'globalConfig.language': '言語',
    'globalConfig.langAuto': '自動（システムに従う）',

    'display.label': '画面 {n}',
    'display.primary': '（メイン）'
  },

  'ko': {
    'app.name': '데스크톱 메모',
    'tray.newNote': '새 메모',
    'tray.newTextNote': '새 텍스트 메모',
    'tray.newWebNote': '새 웹 메모',
    'tray.openMainWindow': '메인 창 열기',
    'tray.lockAll': '모두 잠금',
    'tray.unlockAll': '모두 잠금 해제',
    'tray.showAll': '모두 표시',
    'tray.hideAll': '모두 숨김',
    'tray.quit': '종료',
    'tray.tooltip': '데스크톱 메모',
    'dlg.image': '이미지',

    'config.subtitle': '메인 창',
    'config.calibrate': '위치 조정',
    'config.calibrateTip': '모든 메모를 화면 표시 영역으로 재배치',
    'config.globalConfig': '전체 설정',
    'config.newNote': '+ 새 메모',
    'config.newTextNote': '새 텍스트 메모',
    'config.newWebNote': '새 웹 메모',
    'config.searchPlaceholder': '메모 검색…',
    'config.sortUpdated': '최근 업데이트',
    'config.sortCreated': '생성 시간',
    'config.sortSize': '글자 크기',
    'config.myNotes': '내 메모',
    'config.emptyTitle': '아직 메모 없음',
    'config.emptyHint': '위의 「+ 새 메모」를 눌러 시작',
    'config.emptyNoMatch': '일치하는 메모 없음',
    'config.emptyNoMatchHint': '다른 키워드를 입력해 보세요',
    'config.menuConfig': '메모 설정',
    'config.menuDup': '복제',
    'config.menuToggleHide': '숨김 / 표시',
    'config.menuToggleLock': '잠금 / 잠금 해제',
    'config.menuDelete': '삭제',
    'config.moreActions': '더 보기',
    'config.webNote': '웹 메모',
    'config.emptyNote': '빈 메모',
    'config.noUrl': 'URL 미설정',
    'config.emptyContent': '(빈 내용)',
    'config.hidden': '숨김',
    'config.shown': '표시됨',
    'config.confirmDelete': '이 메모를 삭제할까요? 취소할 수 없습니다.',
    'config.chars': '{n}자',
    'config.justNow': '방금',
    'config.minutesAgo': '{n}분 전',
    'config.hoursAgo': '{n}시간 전',
    'config.daysAgo': '{n}일 전',

    'note.drag': '드래그',
    'note.bold': '굵게',
    'note.italic': '기울임',
    'note.list': '목록',
    'note.link': '링크',
    'note.image': '이미지 삽입',
    'note.textColor': '글자 색',
    'note.lock': '잠금',
    'note.done': '완료',
    'note.urlPlaceholder': 'URL 입력 (예: https://…)',
    'note.go': '이동',
    'note.reload': '새로 고침',
    'note.linkPrompt': '링크 URL 입력:',

    'noteConfig.type': '종류',
    'noteConfig.title': '메모 설정',
    'noteConfig.textNote': '텍스트 메모',
    'noteConfig.webNote': '웹 메모',
    'noteConfig.display': '화면',
    'noteConfig.posSize': '크기 및 위치',
    'noteConfig.x': 'X',
    'noteConfig.y': 'Y',
    'noteConfig.width': '너비',
    'noteConfig.height': '높이',
    'noteConfig.appearance': '모양',
    'noteConfig.background': '배경',
    'noteConfig.text': '글자',
    'noteConfig.fontSize': '글자 크기',
    'noteConfig.opacity': '투명도',
    'noteConfig.behavior': '동작',
    'noteConfig.hide': '숨김',
    'noteConfig.alwaysOnTop': '항상 위',
    'noteConfig.lock': '잠금',
    'noteConfig.lockHint': '잠그면 메모는 클릭이 통과되며 여기서만 설정 가능',
    'noteConfig.locate': '위치 표시',
    'noteConfig.reset': '초기화',
    'noteConfig.delete': '삭제',
    'noteConfig.close': '닫기',
    'noteConfig.resetConfirm': '모양을 기본값으로 초기화할까요?',
    'noteConfig.deleteConfirm': '이 메모를 삭제할까요? 취소할 수 없습니다.',

    'globalConfig.launchOnStartup': '시작 시 실행',
    'globalConfig.launchDesc': 'Windows 로그인 후 데스크톱 메모 자동 실행',
    'globalConfig.theme': '테마',
    'globalConfig.themeLight': '라이트',
    'globalConfig.themeDark': '다크',
    'globalConfig.themeSystem': '시스템',
    'globalConfig.themeHint': '모든 설정 창에 즉시 적용',
    'globalConfig.defaults': '새 메모 기본값',
    'globalConfig.defaultFontSize': '기본 글자 크기',
    'globalConfig.defaultFontSizeDesc': '새 텍스트 메모의 초기 글자 크기',
    'globalConfig.defaultOpacity': '기본 투명도',
    'globalConfig.defaultOpacityDesc': '새 메모의 초기 투명도',
    'globalConfig.defaultBg': '기본 배경색',
    'globalConfig.defaultText': '기본 글자 색',
    'globalConfig.savedHint': '설정은 즉시 저장됨',
    'globalConfig.title': '전체 설정',
    'globalConfig.language': '언어',
    'globalConfig.langAuto': '자동 (시스템 따르기)',

    'display.label': '화면 {n}',
    'display.primary': '(주)'
  }
};

// 把 app.getLocale() 之类的字符串规范化到受支持的语言
function normalizeAppLocale(raw) {
  if (!raw) return null;
  const l = String(raw).toLowerCase();
  if (l === 'zh-cn' || l === 'zh' || l === 'zh-hans' || l === 'zh-sg' || l === 'zh-my') return 'zh-CN';
  if (l === 'zh-tw' || l === 'zh-hant' || l === 'zh-hk' || l === 'zh-mo') return 'zh-TW';
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('ja')) return 'ja';
  if (l.startsWith('ko')) return 'ko';
  return null;
}

/**
 * 解析最终生效语言。
 * @param {string} setting  settings.language，'auto'/null/'' 表示跟随系统
 * @param {string} appLocale app.getLocale() 返回值
 * @returns {string} 受支持的语言代码
 */
function resolveLocale(setting, appLocale) {
  const s = (setting && setting !== 'auto') ? normalizeAppLocale(setting) : null;
  if (s) return s;
  const a = normalizeAppLocale(appLocale);
  return a || 'zh-CN'; // 未知语言回退简体中文
}

// 简单的 {n} 占位符替换
function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : '{' + k + '}'));
}

// 取译文：当前语言 → 简体中文 → key
function t(locale, key, params) {
  const dict = messages[locale] || messages['zh-CN'];
  const raw = (key in dict) ? dict[key] : (key in messages['zh-CN'] ? messages['zh-CN'][key] : key);
  return interpolate(raw, params);
}

// 按语言格式化相对时间（处理英语复数）
function formatRelTime(locale, iso) {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (isNaN(time)) return '';
  const diff = Date.now() - time;
  const m = Math.floor(diff / 60000);
  if (m < 1) return t(locale, 'config.justNow');
  if (m < 60) {
    if (locale === 'en') return m + (m === 1 ? ' minute ago' : ' minutes ago');
    return t(locale, 'config.minutesAgo', { n: m });
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    if (locale === 'en') return h + (h === 1 ? ' hour ago' : ' hours ago');
    return t(locale, 'config.hoursAgo', { n: h });
  }
  const d = Math.floor(h / 24);
  if (d < 30) {
    if (locale === 'en') return d + (d === 1 ? ' day ago' : ' days ago');
    return t(locale, 'config.daysAgo', { n: d });
  }
  const dt = new Date(time);
  return (dt.getMonth() + 1) + '-' + dt.getDate();
}

// 按语言格式化字数（处理英语复数）
function formatCount(locale, n) {
  if (locale === 'en') return n + (n === 1 ? ' char' : ' chars');
  return t(locale, 'config.chars', { n });
}

// 注意：DOM 翻译辅助 applyI18n 内联在各 preload 中（沙箱 preload 无法 require 本文件）。

module.exports = {
  LOCALES,
  LOCALE_LABELS,
  messages,
  resolveLocale,
  t,
  formatRelTime,
  formatCount
};
