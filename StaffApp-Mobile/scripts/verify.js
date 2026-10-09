#!/usr/bin/env node
/**
 * Kiểm tra tĩnh CE Staff (không cần node_modules):
 *  1. Mọi import tương đối trỏ tới file có thật.
 *  2. Mọi named/default import tồn tại trong file được import.
 *  3. Mọi import gói npm có trong package.json dependencies.
 *  4. Mọi component JSX (<Tên ...>) đã được khai báo hoặc import.
 *  5. Đối chiếu API: method + path app gọi (src/api.js) với [Http*] route trong StaffApiController*.cs & ShipperApiController.cs;
 *     tên trường JSON body / query / multipart so với DTO C# và tham số action.
 * Chạy: node scripts/verify.js [đường_dẫn_Controllers/Api]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.resolve(process.argv[2] || path.join(ROOT, '..', 'CourierExpress', 'Controllers', 'Api'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const deps = new Set(Object.keys(pkg.dependencies || {}));
const errors = [];
const warns = [];
const err = (m) => errors.push(m);

// ---------------------------------------------------------------- tiện ích
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.')) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

/** Bỏ comment, giữ nguyên chuỗi (để không hiểu nhầm 'http://...' là comment) */
function stripComments(src) {
  let out = ''; let i = 0; let mode = null; // null | "'" | '"' | '`' | 'line' | 'block' | 'regex'
  while (i < src.length) {
    const c = src[i]; const n = src[i + 1];
    if (mode === 'line') { if (c === '\n') { mode = null; out += c; } i++; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = null; i += 2; } else { if (c === '\n') out += c; i++; } continue; }
    if (mode === "'" || mode === '"' || mode === '`') {
      out += c;
      if (c === '\\') { out += n || ''; i += 2; continue; }
      if (c === mode) mode = null;
      i++; continue;
    }
    if (c === '/' && n === '/') { mode = 'line'; i += 2; continue; }
    if (c === '/' && n === '*') { mode = 'block'; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') { mode = c; out += c; i++; continue; }
    // regex literal sau dấu ( , = : [ ! & | ? { } ; hoặc đầu dòng
    if (c === '/') {
      const prev = out.replace(/\s+$/, '').slice(-1);
      if (!prev || '(,=:[!&|?{};'.includes(prev)) {
        let j = i + 1; let inClass = false;
        while (j < src.length && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '[') inClass = true; else if (src[j] === ']') inClass = false;
          else if (src[j] === '/' && !inClass) break;
          j++;
        }
        if (src[j] === '/') { out += src.slice(i, j + 1); i = j + 1; continue; }
      }
    }
    out += c; i++;
  }
  return out;
}

/** Thay nội dung chuỗi '...' "..." bằng khoảng trắng (giữ template `...` vì JSX có thể nằm trong ${}) */
const blankStrings = (s) => s.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, (m) => m[0] + ' '.repeat(m.length - 2) + m[0]);

function resolveRel(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base, base + '.js', path.join(base, 'index.js')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}

// ---------------------------------------------------------------- phân tích file JS
const files = [path.join(ROOT, 'App.js'), ...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'scripts')).filter((f) => !f.endsWith('verify.js'))];
const info = {};
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const code = stripComments(raw);
  const imports = [];
  const reImp = /import\s+([^'";]*?)\s+from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = reImp.exec(code))) {
    if (m[3]) { imports.push({ spec: m[3], def: null, named: [], ns: null }); continue; }
    const clause = m[1].trim(); const spec = m[2];
    const it = { spec, def: null, named: [], ns: null };
    const ns = clause.match(/\*\s+as\s+(\w+)/); if (ns) it.ns = ns[1];
    const braces = clause.match(/\{([\s\S]*)\}/);
    if (braces) it.named = braces[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [a, b] = s.split(/\s+as\s+/); return { name: a.trim(), local: (b || a).trim() }; });
    const head = clause.replace(/\{[\s\S]*\}/, '').replace(/\*\s+as\s+\w+/, '').replace(/,/g, ' ').trim();
    if (head) it.def = head.split(/\s+/)[0];
    imports.push(it);
  }
  const exports = new Set(); let hasDefault = false;
  for (const x of code.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+(\w+)/g)) exports.add(x[1]);
  for (const x of code.matchAll(/export\s*\{([^}]*)\}/g)) x[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => exports.add(s.split(/\s+as\s+/).pop().trim()));
  if (/export\s+default\b/.test(code)) hasDefault = true;
  // khai báo cục bộ
  const locals = new Set();
  for (const x of code.matchAll(/(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/g)) locals.add(x[1]);
  for (const x of code.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) locals.add(x[1]);
  for (const x of code.matchAll(/(?:const|let|var)\s+\{([^}]*)\}\s*=/g)) x[1].split(',').forEach((s) => { const n = s.split(':').pop().split('=')[0].trim(); if (n) locals.add(n); });
  info[f] = { code, imports, exports, hasDefault, locals };
}

// 1–3. import
for (const [f, it] of Object.entries(info)) {
  const rel = path.relative(ROOT, f);
  for (const imp of it.imports) {
    if (imp.spec.startsWith('.')) {
      const target = resolveRel(f, imp.spec);
      if (!target) { err(`${rel}: import "${imp.spec}" không tồn tại`); continue; }
      const t = info[target];
      if (!t) continue;
      if (imp.def && !t.hasDefault) err(`${rel}: "${imp.spec}" không có export default (import ${imp.def})`);
      for (const n of imp.named) if (!t.exports.has(n.name)) err(`${rel}: "${imp.spec}" không export "${n.name}"`);
    } else {
      const name = imp.spec.startsWith('@') ? imp.spec.split('/').slice(0, 2).join('/') : imp.spec.split('/')[0];
      if (!deps.has(name)) err(`${rel}: gói "${name}" chưa có trong package.json dependencies`);
    }
  }
}

// 4. JSX component đã khai báo / import
for (const [f, it] of Object.entries(info)) {
  const rel = path.relative(ROOT, f);
  const known = new Set([...it.locals]);
  for (const imp of it.imports) { if (imp.def) known.add(imp.def); if (imp.ns) known.add(imp.ns); imp.named.forEach((n) => known.add(n.local)); }
  const body = blankStrings(it.code);
  const used = new Set();
  for (const x of body.matchAll(/<([A-Z][\w$]*)(?:\.[\w$]+)*[\s/>]/g)) used.add(x[1]);
  for (const u of used) if (!known.has(u)) err(`${rel}: component <${u}> chưa được khai báo hoặc import`);
}

// 4b. Tên màn hình navigate(...) phải được đăng ký trong App.js
const appCode = info[path.join(ROOT, 'App.js')].code;
const screens = new Set([...appCode.matchAll(/<(?:Stack|Tab)\.Screen[^>]*name="(\w+)"/g)].map((x) => x[1]));
['Tasks', 'Scan', 'WarehouseTab', 'DispatchTab', 'FinanceTab', 'CasesTab', 'LookupTab'].forEach((t) => screens.add(t)); // tab động (modules.js)
for (const [f, it] of Object.entries(info)) {
  for (const x of it.code.matchAll(/(?:\.(?:navigate|replace|push)|\bgo)\(\s*'(\w+)'/g)) {
    if (!screens.has(x[1])) err(`${path.relative(ROOT, f)}: navigate('${x[1]}') – màn hình chưa đăng ký trong App.js`);
  }
}
const modCode = info[path.join(ROOT, 'src', 'modules.js')].code;
for (const x of modCode.matchAll(/hub:\s*'(\w+)'/g)) if (!screens.has(x[1])) err(`modules.js: hub '${x[1]}' chưa đăng ký`);

// ---------------------------------------------------------------- 5. API ↔ C#
function splitTop(s, angle = true) {
  const out = []; let depth = 0; let cur = ''; let prev = '';
  for (const c of s) {
    const opens = angle ? '<([{' : '([{'; const closes = angle ? '>)]}' : ')]}';
    if (opens.includes(c)) depth++;
    if (closes.includes(c) && !(c === '>' && prev === '=')) depth--;
    prev = c;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim());
}
const camel = (s) => s[0].toLowerCase() + s.slice(1);
const csFiles = fs.readdirSync(API_DIR).filter((f) => /^(StaffApiController.*|ShipperApiController|AppApiBase)\.cs$/.test(f));
const csAll = csFiles.map((f) => fs.readFileSync(path.join(API_DIR, f), 'utf8')).join('\n');
const dtos = {};
for (const x of csAll.matchAll(/public\s+class\s+(\w+)\s*(?::[^{]*)?\{([\s\S]*?)\n\}/g)) {
  const props = [...x[2].matchAll(/public\s+[\w<>?,\s]+?\s+(\w+)\s*\{\s*get;\s*set;\s*\}/g)].map((p) => camel(p[1]));
  if (props.length) dtos[x[1]] = props;
}
const routes = [];
for (const f of csFiles.filter((x) => x !== 'AppApiBase.cs')) {
  const src = fs.readFileSync(path.join(API_DIR, f), 'utf8');
  const base = f.startsWith('Shipper') ? 'api/shipper' : 'api/staff';
  const re = /\[Http(Get|Post|Put|Delete|Patch)\("([^"]*)"\)[^\]]*\][\s\S]*?public\s+async\s+Task<IActionResult>\s+(\w+)\s*\(([\s\S]*?)\)\s*(?:\n\s*\{|=>|\{)/g;
  let m;
  while ((m = re.exec(src))) {
    const [, method, rpath, action, paramStr] = m;
    const full = '/' + base + (rpath ? '/' + rpath : '');
    const routeParams = [...full.matchAll(/\{(\w+)(?::\w+)?\}/g)].map((x) => x[1]);
    const params = splitTop(paramStr.replace(/\s+/g, ' ')).filter(Boolean).map((p) => {
      const fromBody = /\[FromBody\]/.test(p); const fromForm = /\[FromForm\]/.test(p);
      const clean = p.replace(/\[[^\]]*\]/g, '').trim().split('=')[0].trim();
      const parts = clean.split(/\s+/); const name = parts.pop(); const type = parts.join(' ');
      return { name, type, fromBody, fromForm, file: /IFormFile/.test(type) };
    });
    const bodyP = params.find((p) => p.fromBody);
    let bodyDto = null;
    if (bodyP) { const t = bodyP.type.replace(/\?$/, '').replace(/^List<(\w+)>$/, '$1'); bodyDto = { type: bodyP.type, props: dtos[t] || null }; }
    routes.push({
      method: method.toUpperCase(), path: full.replace(/\{(\w+)(?::\w+)?\}/g, '{}'), action, file: f,
      query: params.filter((p) => !p.fromBody && !p.fromForm && !p.file && !routeParams.includes(p.name)).map((p) => p.name),
      form: params.filter((p) => p.fromForm || p.file).map((p) => p.name),
      bodyDto,
    });
  }
}

// trích hàm trong src/api.js
const apiSrc = info[path.join(ROOT, 'src', 'api.js')].code;
function balanced(s, start) { // s[start] === '{' | '('
  const open = s[start]; const close = open === '{' ? '}' : open === '(' ? ')' : ']';
  let d = 0;
  for (let i = start; i < s.length; i++) { if (s[i] === open) d++; else if (s[i] === close) { d--; if (d === 0) return s.slice(start, i + 1); } }
  return s.slice(start);
}
function topKeys(obj) {
  const inner = obj.slice(1, -1);
  return splitTop(inner, false).map((p) => p.split(':')[0].replace(/^\.\.\./, '').trim()).filter((k) => /^\w+$/.test(k));
}
const calls = [];
for (const group of ['staff', 'shipper']) {
  const gStart = apiSrc.indexOf(`export const ${group} = {`);
  const gBody = balanced(apiSrc, apiSrc.indexOf('{', gStart));
  // từng hàm: "  name: (...) => ..." ở mức 1
  const entries = splitTop(gBody.slice(1, -1), false);
  for (const e of entries) {
    const nm = e.match(/^(\w+)\s*:/); if (!nm) continue;
    const c = e.match(/call\('(\w+)',\s*(['`])(.*?)\2/);
    if (!c) { err(`api.js ${group}.${nm[1]}: không tìm thấy call(method, path)`); continue; }
    const p = c[3].replace(/\$\{[^}]*\}/g, '{}');
    const afterCall = e.slice(e.indexOf(c[0]));
    const bodyIdx = afterCall.search(/\bbody:\s*/);
    let bodyKeys = null;
    if (bodyIdx >= 0) {
      const from = afterCall.indexOf('{', bodyIdx);
      if (from >= 0) bodyKeys = topKeys(balanced(afterCall, from));
    }
    const qIdx = afterCall.search(/\bquery:\s*\{/);
    const queryKeys = qIdx >= 0 ? topKeys(balanced(afterCall, afterCall.indexOf('{', qIdx))) : [];
    const formKeys = [...e.matchAll(/\.append\('(\w+)'/g)].map((x) => x[1]);
    calls.push({ fn: `${group}.${nm[1]}`, method: c[1], path: p, bodyKeys, queryKeys, formKeys: [...new Set(formKeys)] });
  }
}

const report = [];
let mismatches = 0;
for (const c of calls) {
  const r = routes.find((x) => x.method === c.method && x.path === c.path);
  if (!r) { mismatches++; err(`API ${c.fn}: ${c.method} ${c.path} – KHÔNG có route tương ứng trong C#`); continue; }
  const notes = [];
  if (c.bodyKeys) {
    if (!r.bodyDto) { mismatches++; err(`API ${c.fn}: gửi JSON body nhưng action ${r.action} không có [FromBody]`); }
    else if (r.bodyDto.props) {
      for (const k of c.bodyKeys) if (!r.bodyDto.props.includes(k)) { mismatches++; err(`API ${c.fn}: trường body "${k}" không có trong ${r.bodyDto.type} (${r.bodyDto.props.join(', ')})`); }
      const missing = r.bodyDto.props.filter((p) => !c.bodyKeys.includes(p));
      if (missing.length) notes.push(`không gửi: ${missing.join(', ')}`);
    }
  } else if (r.bodyDto && c.method !== 'GET') notes.push(`body {} mặc định cho ${r.bodyDto.type}`);
  for (const k of c.queryKeys) if (!r.query.includes(k)) { mismatches++; err(`API ${c.fn}: query "${k}" không phải tham số của ${r.action} (${r.query.join(', ') || 'không có'})`); }
  for (const k of c.formKeys) if (!r.form.includes(k)) { mismatches++; err(`API ${c.fn}: trường multipart "${k}" không có trong ${r.action} (${r.form.join(', ')})`); }
  if (r.form.length && !c.formKeys.length) { mismatches++; err(`API ${c.fn}: action ${r.action} nhận multipart (${r.form.join(', ')}) nhưng app không gửi FormData`); }
  report.push(`  ✓ ${c.method.padEnd(4)} ${c.path.padEnd(48)} ${c.fn}${notes.length ? '  (' + notes.join('; ') + ')' : ''}`);
}
const unused = routes.filter((r) => !calls.some((c) => c.method === r.method && c.path === r.path));

// ---------------------------------------------------------------- kết quả
console.log(`CE Staff – kiểm tra tĩnh`);
console.log(`  File JS: ${files.length} · màn hình đăng ký: ${screens.size} · route C#: ${routes.length} · hàm API app: ${calls.length}`);
console.log('\nĐối chiếu API (app → C#):');
console.log(report.join('\n'));
if (unused.length) console.log('\nRoute C# app không gọi (thông tin):\n' + unused.map((r) => `  - ${r.method} ${r.path} (${r.action})`).join('\n'));
if (warns.length) console.log('\nCảnh báo:\n' + warns.map((w) => '  ! ' + w).join('\n'));
console.log(`\nAPI mismatch: ${mismatches}`);
if (errors.length) {
  console.log(`\nLỖI (${errors.length}):\n` + errors.map((e) => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
console.log('\nKhông có lỗi: import/export, dependencies, component JSX, tên màn hình và API đều khớp.');
