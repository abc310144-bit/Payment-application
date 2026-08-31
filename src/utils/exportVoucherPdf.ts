import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { PDFDocument } from 'pdf-lib'
import type { StoredApplication } from '../context/ApplicationContext'
import { dashOrValue, type VoucherDetail, type VoucherFile } from '../types/voucher'
import { todayISO } from './expectedPaymentDate'
import { allowsDecimalAmount, formatAmount, roundMoney } from './money'
import { calcLineContribution } from './voucherTax'

function escapeHtml(value: string | number) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function dash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return escapeHtml(value)
}

function isImageFile(file: VoucherFile) {
  return file.type.startsWith('image/')
}

function isPdfFile(file: VoucherFile) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

/** 重新下載已導出的同一份檔案（不重新產生） */
export function downloadExistingVoucherFile(file: VoucherFile) {
  const link = document.createElement('a')
  link.href = file.url
  link.download = file.name
  link.click()
}

function mark(checked: boolean) {
  return checked ? '■' : '□'
}

function formatChtDate(iso: string | null | undefined) {
  if (!iso) return '　　年　　月　　日'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return '　　年　　月　　日'
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`
}

function vendorDisplayName(app: StoredApplication) {
  const name = app.overview?.vendorName || ''
  return name.replace(/^[A-Za-z0-9]+\s+/, '') || name
}

function expectedPayDate(app: StoredApplication) {
  return (
    app.expectedPaymentDate ||
    app.overview?.expectedPaymentDate ||
    ''
  )
}

function renderFileBlock(kind: string, file: VoucherFile) {
  if (isPdfFile(file)) {
    return `
      <div class="pdf-file">
        <div class="pdf-file-title pdf-keep">${escapeHtml(kind)}：${escapeHtml(file.name)}（以下為上傳 PDF 原頁）</div>
        <div class="pdf-embed-pdf" data-pdf-url="${escapeHtml(file.url)}" data-pdf-name="${escapeHtml(file.name)}"></div>
      </div>
    `
  }
  const preview = isImageFile(file)
    ? `<img src="${escapeHtml(file.url)}" alt="${escapeHtml(file.name)}" />`
    : `<div class="pdf-fallback">檔案：${escapeHtml(file.name)}（非圖片，無法內嵌預覽）</div>`
  return `
    <div class="pdf-file pdf-keep">
      <div class="pdf-file-title">${escapeHtml(kind)}：${escapeHtml(file.name)}</div>
      ${preview}
    </div>
  `
}

function renderDetailFiles(detail: VoucherDetail) {
  const blocks = [
    detail.voucherFile
      ? renderFileBlock('主憑證', detail.voucherFile)
      : '<div class="pdf-fallback pdf-keep">尚未上傳主憑證</div>',
    ...(detail.attachments ?? []).map((file, idx) =>
      renderFileBlock(`附件 ${idx + 1}`, file),
    ),
  ]
  return `<div class="pdf-files">${blocks.join('')}</div>`
}

function emptyAmountCells() {
  return '<td class="num"></td><td class="num"></td><td class="num"></td>'
}

function renderFormRows(details: VoucherDetail[], currency?: string | null) {
  const minRows = 5
  const body: string[] = []
  let totalUntaxed = 0
  let totalTax = 0
  let totalPay = 0
  const decimal = allowsDecimalAmount(currency)

  for (const detail of details) {
    const lines = detail.lines?.length
      ? detail.lines
      : [
          {
            id: detail.id,
            name: detail.purpose,
            taxable: detail.taxable,
            amount: detail.payAmount,
          },
        ]
    for (const line of lines) {
      const c = calcLineContribution(
        detail.taxable,
        line.taxable,
        line.amount,
        decimal,
      )
      const taxFlag = detail.taxable === '未稅' ? '未稅' : line.taxable
      totalUntaxed += c.untaxed
      totalTax += c.tax
      totalPay += c.pay
      body.push(`
        <tr>
          <td>${dash(line.name)}（${taxFlag}）</td>
          <td class="num">${dash(formatAmount(c.untaxed, currency))}</td>
          <td class="num">${dash(formatAmount(c.tax, currency))}</td>
          <td class="num">${dash(formatAmount(c.pay, currency))}</td>
        </tr>
      `)
    }
  }

  while (body.length < minRows) {
    body.push(`<tr><td>&nbsp;</td>${emptyAmountCells()}</tr>`)
  }
  body.push(`
    <tr>
      <td class="total-label">合計</td>
      <td class="num">${details.length ? dash(formatAmount(roundMoney(totalUntaxed), currency)) : ''}</td>
      <td class="num">${details.length ? dash(formatAmount(roundMoney(totalTax), currency)) : ''}</td>
      <td class="num">${details.length ? dash(formatAmount(roundMoney(totalPay), currency)) : ''}</td>
    </tr>
  `)
  return body.join('')
}

function renderPaymentForm(app: StoredApplication, details: VoucherDetail[]) {
  const method = app.overview?.paymentMethod || ''
  const fee = app.overview?.remittanceFee || ''
  const payDate = expectedPayDate(app)
  return `
    <section class="pay-form">
      <div class="pay-company">饌元股份有限公司</div>
      <div class="pay-title">付款申請書</div>
      <div class="pay-date">${formatChtDate(todayISO())}</div>
      <table class="pay-table">
        <thead>
          <tr>
            <th style="width:46%">付款內容</th>
            <th style="width:18%">未稅金額</th>
            <th style="width:18%">稅額</th>
            <th style="width:18%">小計</th>
          </tr>
        </thead>
        <tbody>${renderFormRows(details, app.overview?.currency)}</tbody>
      </table>
      <table class="pay-table pay-meta">
        <tr>
          <td class="label" style="width:12%">備註</td>
          <td></td>
          <td class="label" style="width:12%">付款日</td>
          <td style="width:32%">
            <div>${mark(Boolean(payDate))} ${formatChtDate(payDate)}</div>
            <div class="pay-note">${mark(false)} 單據核銷，不需付款</div>
          </td>
        </tr>
        <tr>
          <td class="label">付款方式</td>
          <td colspan="3">
            <div>${mark(method === '匯款')} 匯款（註：員工一律匯款至薪資帳戶）</div>
            <div class="indent">匯費：${mark(fee === '公司負擔')} 本公司負擔　${mark(fee === '收款人負擔')} 收款人負擔</div>
            <div>${mark(method === '開立支票')} 開立支票　　${mark(method === '現金')} 零用金（1,000元以下）　　簽收：</div>
            <div class="cashier">（由出納人員勾選）${mark(false)} 不適用零用金請款，改走一般請款　　出納人員簽章：</div>
          </td>
        </tr>
        <tr>
          <td class="label" colspan="4">廠商／收款人匯款資訊</td>
        </tr>
        <tr>
          <td class="label">匯款對象名稱</td>
          <td colspan="3">
            ${dash(vendorDisplayName(app))}
            <div class="pay-note">${mark(false)} 非首次匯款　　${mark(false)} 首次匯款，請檢附廠商匯款資料表</div>
          </td>
        </tr>
      </table>
      <table class="pay-table sign-table">
        <tr>
          <th>董事長</th>
          <th>總經理</th>
          <th>處級主管</th>
          <th>部級主管</th>
          <th>申請人</th>
        </tr>
        <tr>
          <td class="sign-cell"></td>
          <td class="sign-cell"></td>
          <td class="sign-cell"></td>
          <td class="sign-cell"></td>
          <td class="sign-cell"></td>
        </tr>
      </table>
      <div class="pay-footnotes">
        <div>〈備註〉</div>
        <div>1.請款請檢附載有公司抬頭或統一編號之發票或收據及相關單據。2.內容請勿塗改，若有塗改需重新簽核。</div>
        <div>3.簽核權限：2,000（含）元以下由課級主管核准；2,001~5,000元由部級主管核准；5,001~2,000,000元由總經理核准；2,000,000（含）元以上由董事長核准。</div>
        <div>〈提醒〉若取得不動產、設備或其使用權超過2,000萬元者，須提經董事會通過後始得為之。</div>
        <div>4.付款日請依據合約條款填寫，合約內未約定者，以財務部實際作業為主。5.若為第一次往來廠商（收款人），請檢附廠商匯款資料表及存摺封面影本。</div>
      </div>
    </section>
  `
}

function renderAttachments(details: VoucherDetail[]) {
  if (details.length === 0) return ''
  return `
    <section class="pdf-attachments">
      <h2 class="pdf-keep">明細憑證與附件</h2>
      ${details
        .map(
          (detail, idx) => `
            <div class="pdf-attach-block">
              <h3 class="pdf-keep">${idx + 1}. ${escapeHtml(detail.purpose)}　${escapeHtml(detail.voucherStyle)}　${escapeHtml(dashOrValue(detail.invoiceNo))}</h3>
              ${renderDetailFiles(detail)}
            </div>
          `,
        )
        .join('')}
    </section>
  `
}

function buildExportHtml(app: StoredApplication) {
  const details = app.vouchers.filter((item) => item.status === '草稿')
  return `
    <div class="pdf-root">
      ${renderPaymentForm(app, details)}
      ${renderAttachments(details)}
    </div>
  `
}

function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'))
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }),
    ),
  )
}

const PDF_MARGIN_MM = 8

function mountPdfNode(html: string) {
  const host = document.createElement('div')
  host.setAttribute('data-voucher-pdf', 'true')
  // Keep the node in normal layout (not off-screen). html2canvas + a
  // left:-10000px host can stack sections on top of each other.
  host.style.cssText =
    'position:fixed;left:0;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none;opacity:0.01;'
  host.innerHTML = `
    <style>
      .pdf-root { width: 794px; padding: 24px 28px 36px; background: #fff; color: #1f1f1f; font-family: "Microsoft JhengHei", "PMingLiU", "Noto Sans TC", serif; }
      .pay-form { display: block; }
      .pay-company { text-align: center; font-size: 22px; font-weight: 700; letter-spacing: 2px; }
      .pay-title { text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 8px; margin: 4px 0 10px; }
      .pay-date { text-align: center; font-size: 14px; margin-bottom: 16px; }
      .pay-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .pay-table th, .pay-table td { border: 1px solid #000; padding: 7px 8px; vertical-align: top; }
      .pay-table th { font-weight: 700; text-align: center; background: #fff; }
      .pay-table .num { text-align: right; white-space: nowrap; }
      .pay-table .label { text-align: center; font-weight: 700; width: 88px; }
      .pay-table .total-label { text-align: center; font-weight: 700; }
      .pay-meta td { height: 42px; }
      .pay-note { margin-top: 8px; }
      .indent { margin: 4px 0 4px 28px; }
      .cashier { margin-top: 6px; color: #c41d7f; }
      .sign-table { margin-top: 0; }
      .sign-table th { height: 28px; }
      .sign-cell { height: 88px; }
      .pay-footnotes { margin-top: 10px; font-size: 11px; line-height: 1.65; color: #1f1f1f; }
      .pdf-attachments { margin-top: 28px; display: block; }
      .pdf-attachments h2 { margin: 0 0 14px; font-size: 18px; }
      .pdf-attach-block { margin-bottom: 18px; }
      .pdf-attach-block h3 { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
      .pdf-files { display: grid; gap: 12px; }
      .pdf-file-title { margin-bottom: 6px; font-size: 12px; color: #595959; }
      .pdf-file img { display: block; max-width: 738px; max-height: 720px; border: 1px solid #e8e8e8; }
      .pdf-fallback { padding: 12px; border: 1px dashed #d9d9d9; color: #595959; background: #fff; font-size: 12px; }
    </style>
    ${html}
  `
  document.body.appendChild(host)
  return host
}

function pageMetrics(pdf: jsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  return {
    pageWidth,
    pageHeight,
    margin: PDF_MARGIN_MM,
    usableWidth: pageWidth - PDF_MARGIN_MM * 2,
    usableHeight: pageHeight - PDF_MARGIN_MM * 2,
  }
}

function sliceCanvas(
  canvas: HTMLCanvasElement,
  srcY: number,
  srcHeight: number,
) {
  const height = Math.max(1, Math.round(srcHeight))
  const slice = document.createElement('canvas')
  slice.width = canvas.width
  slice.height = height
  const ctx = slice.getContext('2d')
  if (!ctx) throw new Error('無法建立 PDF 畫布')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, slice.width, slice.height)
  ctx.drawImage(
    canvas,
    0,
    Math.round(srcY),
    canvas.width,
    height,
    0,
    0,
    canvas.width,
    height,
  )
  return slice
}

/** Draw a canvas in page-sized strips. Never paint a taller-than-page image. */
function appendCanvasPaged(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  cursor: { y: number },
  gapMm = 3,
) {
  const { pageHeight, margin, usableWidth } = pageMetrics(pdf)
  if (canvas.width < 1 || canvas.height < 1) return
  const fullHeightMm = (canvas.height * usableWidth) / canvas.width
  const pxPerMm = canvas.height / fullHeightMm
  let srcY = 0
  while (srcY < canvas.height) {
    let availMm = pageHeight - margin - cursor.y
    if (availMm < 8 && cursor.y > margin + 0.5) {
      pdf.addPage()
      cursor.y = margin
      availMm = pageHeight - margin * 2
    }
    const srcRemaining = canvas.height - srcY
    const slicePx = Math.max(1, Math.min(srcRemaining, Math.floor(availMm * pxPerMm)))
    const slice = sliceCanvas(canvas, srcY, slicePx)
    const drawH = slicePx / pxPerMm
    pdf.addImage(
      slice.toDataURL('image/png'),
      'PNG',
      margin,
      cursor.y,
      usableWidth,
      drawH,
    )
    cursor.y += drawH
    srcY += slicePx
    if (srcY < canvas.height) {
      pdf.addPage()
      cursor.y = margin
    }
  }
  cursor.y += gapMm
}

async function captureElement(el: HTMLElement) {
  return html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: Math.max(el.scrollWidth, 794),
    windowHeight: Math.max(el.scrollHeight, 1),
    onclone(doc) {
      const cloned = doc.querySelector('[data-voucher-pdf]')
      if (cloned instanceof HTMLElement) {
        cloned.style.left = '0'
        cloned.style.top = '0'
        cloned.style.opacity = '1'
        cloned.style.zIndex = '0'
      }
    },
  })
}

function createWorkingPdf() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

async function appendJsPdf(merged: PDFDocument, pdf: jsPDF) {
  const src = await PDFDocument.load(pdf.output('arraybuffer'))
  const pages = await merged.copyPages(src, src.getPageIndices())
  pages.forEach((page) => merged.addPage(page))
}

async function appendUploadedPdf(
  merged: PDFDocument,
  url: string,
  name: string,
  failed: string[],
) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const src = await PDFDocument.load(await res.arrayBuffer(), {
      ignoreEncryption: true,
    })
    const pages = await merged.copyPages(src, src.getPageIndices())
    if (pages.length === 0) throw new Error('empty pdf')
    pages.forEach((page) => merged.addPage(page))
  } catch {
    failed.push(name)
  }
}

function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer], { type: 'application/pdf' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  return href
}

export async function downloadVoucherPdf(app: StoredApplication): Promise<VoucherFile> {
  const host = mountPdfNode(buildExportHtml(app))
  try {
    const root = host.querySelector('.pdf-root') as HTMLElement
    await waitForImages(root)
    const merged = await PDFDocument.create()
    const failed: string[] = []
    let working: jsPDF | null = null
    let cursor = { y: 8 }

    const ensureWorking = () => {
      if (!working) {
        working = createWorkingPdf()
        cursor = { y: 8 }
      }
      return working
    }

    const flushWorking = async () => {
      if (!working) return
      await appendJsPdf(merged, working)
      working = null
    }

    const form = root.querySelector('.pay-form') as HTMLElement | null
    if (form) {
      const formCanvas = await captureElement(form)
      appendCanvasPaged(ensureWorking(), formCanvas, cursor)
    }

    const attachments = root.querySelector(
      '.pdf-attachments',
    ) as HTMLElement | null
    if (attachments) {
      const { pageHeight, margin } = pageMetrics(ensureWorking())
      if (cursor.y > margin + 0.5 && pageHeight - margin - cursor.y < 28) {
        ensureWorking().addPage()
        cursor.y = margin
      }

      const hasEmbeddedPdf = Boolean(attachments.querySelector('.pdf-embed-pdf'))
      if (!hasEmbeddedPdf) {
        const canvas = await captureElement(attachments)
        appendCanvasPaged(ensureWorking(), canvas, cursor)
      } else {
        const nodes = Array.from(
          attachments.querySelectorAll<HTMLElement>('.pdf-keep, .pdf-embed-pdf'),
        )
        for (const node of nodes) {
          if (node.classList.contains('pdf-embed-pdf')) {
            const url = node.dataset.pdfUrl
            const name = node.dataset.pdfName || 'document.pdf'
            await flushWorking()
            if (url) await appendUploadedPdf(merged, url, name, failed)
            continue
          }
          const canvas = await captureElement(node)
          appendCanvasPaged(ensureWorking(), canvas, cursor)
        }
      }
    }
    await flushWorking()

    if (merged.getPageCount() === 0) {
      throw new Error('導出 PDF 沒有頁面')
    }
    const bytes = await merged.save()
    const filename = `${app.applicationNo}_導出文件.pdf`
    const url = downloadPdfBytes(bytes, filename)
    if (failed.length) {
      window.alert(`以下 PDF 無法合併到導出檔，已略過：\n${failed.join('\n')}`)
    }
    return { name: filename, type: 'application/pdf', url }
  } finally {
    host.remove()
  }
}
