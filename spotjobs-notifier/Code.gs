/**
 * スポットジョブズ エリア通知（Google Apps Script）
 * Gmail に届くスポットジョブズの通知メールを定期チェックし、
 * 指定エリアを含むものだけを ntfy 経由でスマホにプッシュ通知します。
 */

// ===== 設定 =====
const CONFIG = {
  // スポットジョブズの通知メールを探す Gmail 検索条件（差出人に合わせて変更）
  SEARCH_QUERY: 'from:spotjobs newer_than:1d',
  // 通知したいエリア（どれか1つでも本文/件名に含まれれば通知）
  AREAS: ['渋谷', '新宿'],
  // ntfy のトピック名（他人に推測されにくいランダムな文字列にする）
  NTFY_TOPIC: 'spotjobs-change-me-xxxxxx',
  // 処理済みメールに付ける Gmail ラベル
  DONE_LABEL: 'spotjobs-checked',
};

/** トリガーから毎分呼ばれるメイン処理 */
function checkSpotJobs() {
  const label = GmailApp.getUserLabelByName(CONFIG.DONE_LABEL) ||
      GmailApp.createLabel(CONFIG.DONE_LABEL);
  const threads = GmailApp.search(`${CONFIG.SEARCH_QUERY} -label:${CONFIG.DONE_LABEL}`, 0, 50);

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      const subject = msg.getSubject();
      const body = msg.getPlainBody();
      const text = subject + '\n' + body;
      const hits = CONFIG.AREAS.filter(area => text.includes(area));
      if (hits.length === 0) return;

      const url = (body.match(/https?:\/\/\S+/) || [])[0];
      sendPush(`【${hits.join('・')}】${subject}`, body.slice(0, 300), url);
    });
    thread.addLabel(label);
  });
}

/** ntfy にプッシュ通知を送る */
function sendPush(title, message, clickUrl) {
  const payload = { topic: CONFIG.NTFY_TOPIC, title, message, priority: 5, tags: ['briefcase'] };
  if (clickUrl) payload.click = clickUrl;
  UrlFetchApp.fetch('https://ntfy.sh/', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

/** 初回に1度だけ手動実行：毎分チェックするトリガーを作成 */
function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkSpotJobs').timeBased().everyMinutes(1).create();
}

/** 動作確認用：テスト通知を送る */
function testPush() {
  sendPush('テスト通知', 'スポットジョブズ通知の設定が完了しました', null);
}
