import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const referenceRoot = path.resolve(process.argv[2] ?? path.join(root, '..', 'reference-AIdataosha'));
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute); else files.push(absolute);
  }
}
walk(referenceRoot);

const runtimePatterns = [/地图\/pic\/纯地图\.png$/, /日志icon\/.*\.svg$/, /电池\/Battery-.*\.png$/, /元素\/ThresholdBar\.png$/];
const rows = files.sort().map((absolute) => {
  const source = path.relative(referenceRoot, absolute).split(path.sep).join('/');
  const data = fs.readFileSync(absolute);
  const extension = path.extname(source).toLowerCase();
  const status = extension === '.xlsx' ? '运行时快照+逐列测试'
    : runtimePatterns.some((pattern) => pattern.test(source)) ? '运行时视觉资产'
      : ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(extension) ? '视觉验收参考（含固定文字/合成画面）'
        : '规则/叙事/结构验收参考';
  return { source, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex'), status };
});

const output = { sourceRepository: 'https://github.com/HanataniTakahiro/AIdataosha', sourceCommit: '2a1d9956aee30951abd24c5e8b59b3aa9637dda5', total: rows.length, rows };
fs.writeFileSync(path.join(root, 'data/referenceArtifacts.generated.json'), `${JSON.stringify(output, null, 2)}\n`);
const markdown = [
  '# AIdataosha 全素材清单', '',
  `来源固定为 \`${output.sourceRepository}@${output.sourceCommit}\`；共 ${rows.length} 个非 Git 文件。每个文件均以 SHA-256 留档并分配落地方式。`, '',
  '“视觉验收参考”表示图片含固定文字、整页 UI、人物或事件合成画面，不能替代实时数据组件；它仍参与 UI 对照审计，不计为遗漏。', '',
  '| 参考路径 | 字节 | SHA-256 | 落地方式 |', '|---|---:|---|---|',
  ...rows.map((row) => `| ${row.source.replaceAll('|', '/')} | ${row.bytes} | \`${row.sha256}\` | ${row.status} |`), '',
];
fs.writeFileSync(path.join(root, 'docs/reference-artifact-inventory.md'), `${markdown.join('\n')}\n`);
console.log(`Generated inventory for ${rows.length} artifacts.`);
