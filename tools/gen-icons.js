// tools/gen-icons.js —— 生成小程序所需的极简线条风格 PNG 图标
// 用法：node tools/gen-icons.js
// 产出：images/icons/*.png（TabBar 图标 81x81，页面按钮图标 64x64）
// 说明：纯 Node 实现（zlib + 手写 PNG 编码 + 4 倍超采样抗锯齿），无第三方依赖。
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ---------------- PNG 编码 ----------------
let CRC_TABLE
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function writePNG(file, size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
  fs.writeFileSync(file, png)
}

// ---------------- 几何图元（坐标系 0~100）----------------
// 线段（圆头），hw 为半线宽
function seg(x, y, x1, y1, x2, y2, hw) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 ? ((x - x1) * dx + (y - y1) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= hw
}
// 圆环
function ring(x, y, cx, cy, r, hw) {
  return Math.abs(Math.hypot(x - cx, y - cy) - r) <= hw
}
// 实心圆
function disc(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) <= r
}
// 圆角矩形描边（SDF）
function rrect(x, y, cx, cy, hx, hy, r, hw) {
  const qx = Math.abs(x - cx) - hx + r
  const qy = Math.abs(y - cy) - hy + r
  const sd =
    Math.min(Math.max(qx, qy), 0) +
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
    r
  return Math.abs(sd) <= hw
}
// 实心三角形
function tri(x, y, ax, ay, bx, by, cx, cy) {
  const s1 = (bx - ax) * (y - ay) - (by - ay) * (x - ax)
  const s2 = (cx - bx) * (y - by) - (cy - by) * (x - bx)
  const s3 = (ax - cx) * (y - cy) - (ay - cy) * (x - cx)
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)
}

// ---------------- 图标定义（简约线条风）----------------
const icons = {
  // 全部：盘子（双圆环）
  plate(x, y) {
    return ring(x, y, 50, 50, 35, 5) || ring(x, y, 50, 50, 23, 4.5)
  },
  // 分类：筛选列表（三行圆点+横线）
  filter(x, y) {
    return (
      seg(x, y, 34, 32, 80, 32, 4) ||
      seg(x, y, 34, 50, 80, 50, 4) ||
      seg(x, y, 34, 68, 80, 68, 4) ||
      disc(x, y, 20, 32, 5) ||
      disc(x, y, 20, 50, 5) ||
      disc(x, y, 20, 68, 5)
    )
  },
  // 添加：圆圈加号
  addc(x, y) {
    return (
      ring(x, y, 50, 50, 34, 5) ||
      seg(x, y, 50, 35, 50, 65, 5) ||
      seg(x, y, 35, 50, 65, 50, 5)
    )
  },
  // 编辑：铅笔
  pencil(x, y) {
    return (
      seg(x, y, 42, 58, 70, 30, 7) ||
      tri(x, y, 37, 53, 47, 63, 28, 72)
    )
  },
  // 删除：垃圾桶
  trash(x, y) {
    return (
      rrect(x, y, 50, 58, 16, 22, 6, 4) ||
      seg(x, y, 28, 32, 72, 32, 4) ||
      seg(x, y, 43, 24, 57, 24, 3.5) ||
      seg(x, y, 44, 46, 44, 70, 3.5) ||
      seg(x, y, 56, 46, 56, 70, 3.5)
    )
  },
  // 保存：对勾
  check(x, y) {
    return seg(x, y, 28, 52, 45, 69, 6) || seg(x, y, 45, 69, 74, 36, 6)
  },
  // 取消：叉
  cross(x, y) {
    return seg(x, y, 34, 34, 66, 66, 6) || seg(x, y, 66, 34, 34, 66, 6)
  },
  // 相机
  camera(x, y) {
    return (
      rrect(x, y, 50, 56, 26, 17, 7, 4) ||
      ring(x, y, 50, 58, 9.5, 4) ||
      rrect(x, y, 50, 36, 9, 4, 3, 3.5)
    )
  }
}

// ---------------- 渲染（4 倍超采样抗锯齿）----------------
function renderIcon(fn, size, color) {
  const S = 4
  const big = size * S
  const step = 100 / big
  const cov = new Float32Array(size * size)
  for (let py = 0; py < big; py++) {
    const y = (py + 0.5) * step
    for (let px = 0; px < big; px++) {
      if (fn((px + 0.5) * step, y)) {
        cov[Math.floor(py / S) * size + Math.floor(px / S)]++
      }
    }
  }
  const out = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = color[0]
    out[i * 4 + 1] = color[1]
    out[i * 4 + 2] = color[2]
    out[i * 4 + 3] = Math.round(Math.min(1, cov[i] / (S * S)) * 255)
  }
  return out
}

function hexToRgb(c) {
  return [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16)
  ]
}

// ---------------- 输出清单 ----------------
const GRAY = '#999999'
const ORANGE = '#EE5A24'
const SPECS = [
  // TabBar（81x81，未选中灰 / 选中橙）
  ['tab-all', 'plate', GRAY, 81],
  ['tab-all-active', 'plate', ORANGE, 81],
  ['tab-cat', 'filter', GRAY, 81],
  ['tab-cat-active', 'filter', ORANGE, 81],
  ['tab-add', 'addc', GRAY, 81],
  ['tab-add-active', 'addc', ORANGE, 81],
  // 页面按钮（64x64）
  ['edit', 'pencil', '#666666', 64],
  ['trash', 'trash', '#E53935', 64],
  ['check-white', 'check', '#FFFFFF', 64],
  ['x-gray', 'cross', '#8A8A8A', 64],
  ['camera-white', 'camera', '#FFFFFF', 64]
]

const outDir = path.join(__dirname, '..', 'images', 'icons')
fs.mkdirSync(outDir, { recursive: true })
SPECS.forEach(function (s) {
  const file = path.join(outDir, s[0] + '.png')
  writePNG(file, s[3], renderIcon(icons[s[1]], s[3], hexToRgb(s[2])))
  console.log('OK', s[0] + '.png', s[3] + 'x' + s[3])
})
console.log('共生成', SPECS.length, '个图标到', outDir)
