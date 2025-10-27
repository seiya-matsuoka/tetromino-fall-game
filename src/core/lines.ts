/**
 * 盤面から「全てのセルが埋まっている行」を取り除き、
 * 上の行を下に落とした新しい盤面を返す。
 *
 *   board  ： ライン消去＆下詰め後の新しい盤面
 *   cleared： 一度に消えたライン数（0～4）
 */
export function clearFullLines(board: number[][]): {
  board: number[][];
  cleared: number;
} {
  const rows = board.length;
  if (rows === 0) {
    return { board, cleared: 0 };
  }
  const cols = board[0].length;

  // 下から上に走査し、消えない行だけを集める
  const keptRows: number[][] = [];
  let cleared = 0;

  for (let y = rows - 1; y >= 0; y--) {
    const row = board[y];
    // 行が全部0以外なら埋まってる行なので消す対象
    const isFull = row.every((cell) => cell !== 0);
    if (isFull) {
      cleared++;
      // 消した行は後で上から空行を足すので、ここでは push しない
    } else {
      // 残す行は下詰め用に保持
      keptRows.push([...row]); // コピーしておく
    }
  }

  // keptRows は下側から順に溜まっているので、最終的な行順に戻すために reverse する
  keptRows.reverse();

  // 消した行のぶんだけ、盤面上部に空行を追加する
  const resultRows: number[][] = [];

  // まず上側の空行を必要な数だけ
  for (let i = 0; i < cleared; i++) {
    resultRows.push(new Array(cols).fill(0));
  }

  // その下に keptRows（元の残り行）を積む
  for (const r of keptRows) {
    resultRows.push(r);
  }

  // 念のため長さを元のboardと同じにそろえておく
  // 理論上は同じになるはず
  if (resultRows.length !== rows) {
    // 足りなければさらに空行追加、多ければ下から切り捨てなどで揃える
    // 実装上は足りない/多いことは起こらない想定
    while (resultRows.length < rows) {
      resultRows.unshift(new Array(cols).fill(0));
    }
    while (resultRows.length > rows) {
      resultRows.shift();
    }
  }

  return {
    board: resultRows,
    cleared,
  };
}
