import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { PassThrough } from 'stream';
import { logger } from './logger';

// ============== 常量定义 ==============

// A6 尺寸 (105mm x 148mm) 转换为 pt (1mm = 2.835pt)
const PAGE_WIDTH = 105 * 2.835;   // ~297pt
const PAGE_HEIGHT = 148 * 2.835;  // ~420pt
const QR_SIZE = 150;              // 二维码尺寸

// ============== 类型定义 ==============

/**
 * PDF 生成配置
 */
interface PDFConfig {
  title: string;
  ticketCode: string;
  qrImageBase64: string;  // data:image/png;base64,... 格式
}

/**
 * 批量票券配置
 */
interface BatchTicketConfig {
  ticketCode: string;
  qrImageBase64: string;
}

/**
 * 页面渲染选项
 */
interface RenderPageOptions {
  ticketCode: string;
  qrImageBase64: string;
  useChineseTitle: boolean;
  pageNumber?: number;
  totalPages?: number;
}

// ============== 辅助函数 ==============

/**
 * 渲染单页票券内容
 *
 * 抽取的公共渲染逻辑，供单票和批量 PDF 共用
 */
function renderTicketPage(doc: PDFKit.PDFDocument, options: RenderPageOptions): void {
  const centerX = PAGE_WIDTH / 2;
  const { ticketCode, qrImageBase64, useChineseTitle, pageNumber, totalPages } = options;

  // 标题
  doc
    .fontSize(18)
    .fillColor('#000000')
    .text(useChineseTitle ? '【电子票券】' : '[ E-Ticket ]', 0, 30, {
      width: PAGE_WIDTH,
      align: 'center'
    });

  // 分隔线
  doc
    .moveTo(20, 60)
    .lineTo(PAGE_WIDTH - 20, 60)
    .strokeColor('#000000')
    .lineWidth(1)
    .stroke();

  // 票券代码
  doc
    .fontSize(12)
    .fillColor('#333333')
    .text(
      useChineseTitle ? `票券代码：${ticketCode}` : `Ticket Code: ${ticketCode}`,
      0, 80,
      { width: PAGE_WIDTH, align: 'center' }
    );

  // 二维码图片
  const qrData = qrImageBase64.replace(/^data:image\/\w+;base64,/, '');
  const qrBuffer = Buffer.from(qrData, 'base64');
  const qrX = centerX - QR_SIZE / 2;
  const qrY = 110;

  doc.image(qrBuffer, qrX, qrY, {
    width: QR_SIZE,
    height: QR_SIZE
  });

  // 底部提示文字
  doc
    .fontSize(8)
    .fillColor('#666666')
    .text(
      useChineseTitle ? '请出示此二维码进行核销' : 'Present this QR code for redemption',
      0, qrY + QR_SIZE + 15,
      { width: PAGE_WIDTH, align: 'center' }
    );

  // 页码（仅批量导出时显示）
  if (pageNumber !== undefined && totalPages !== undefined) {
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text(`${pageNumber} / ${totalPages}`, 0, PAGE_HEIGHT - 30, {
        width: PAGE_WIDTH,
        align: 'center'
      });
  }
}

/**
 * 获取系统中文字体路径
 * 支持 macOS 和 Linux 常见字体
 * 注意：PDFKit 只支持 .ttf 格式，不支持 .ttc (TrueType Collection)
 */
function getFontPath(): string | null {
  // 按优先级尝试不同的字体路径（仅 TTF 格式）
  const fontPaths = [
    // macOS 字体 (TTF only)
    '/Library/Fonts/Arial Unicode.ttf',
    // Linux 字体 (TTF only)
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    // 项目本地字体（如果有的话）
    './fonts/NotoSansSC-Regular.ttf',
  ];

  for (const path of fontPaths) {
    try {
      if (path.endsWith('.ttf') && fs.existsSync(path)) {
        logger.debug('pdf.font.found', { path });
        return path;
      }
    } catch {
      // 忽略权限错误
    }
  }

  logger.info('pdf.font.using_builtin', {
    message: 'No compatible TTF font found, using built-in Helvetica'
  });
  return null;
}

// ============== 导出函数 ==============

/**
 * 生成单张电子票券 PDF
 *
 * PDF 布局：
 * +---------------------------+
 * |     【电子票券】           |  ← 标题
 * +---------------------------+
 * |    票券代码：DT-xxxx      |  ← 票券码
 * |      +-------------+      |
 * |      |   QR Code   |      |  ← 二维码
 * |      +-------------+      |
 * +---------------------------+
 *
 * @param config PDF 配置
 * @returns PDF Buffer
 */
export async function generateTicketPDF(config: PDFConfig): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      logger.info('pdf.generation.started', {
        ticket_code: config.ticketCode
      });

      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 20,
        info: {
          Title: `E-Ticket - ${config.ticketCode}`,
          Author: 'Express Ticket System',
          Subject: 'Electronic Ticket',
          Keywords: 'ticket, e-ticket, QR code'
        }
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        logger.info('pdf.generation.success', {
          ticket_code: config.ticketCode,
          pdf_size_bytes: pdfBuffer.length
        });
        resolve(pdfBuffer);
      });

      doc.on('error', (error: Error) => {
        logger.error('pdf.generation.error', {
          ticket_code: config.ticketCode,
          error: error.message
        });
        reject(error);
      });

      // 强制使用英文标题（统一格式）
      const useChineseTitle = false;

      // 渲染票券页面
      renderTicketPage(doc, {
        ticketCode: config.ticketCode,
        qrImageBase64: config.qrImageBase64,
        useChineseTitle
      });

      doc.end();

    } catch (error) {
      logger.error('pdf.generation.failed', {
        ticket_code: config.ticketCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      reject(error);
    }
  });
}

/**
 * 快捷方法：从票券码和 QR 图片生成 PDF
 */
export async function createTicketPDF(
  ticketCode: string,
  qrImageBase64: string
): Promise<Buffer> {
  return generateTicketPDF({
    title: '[ E-Ticket ]',
    ticketCode,
    qrImageBase64
  });
}

/**
 * 批量生成电子票券 PDF（多票合并，每票一页）
 *
 * @param batchId 批次 ID
 * @param tickets 票券列表
 * @returns PDF Buffer
 */
export async function generateBatchPDF(
  batchId: string,
  tickets: BatchTicketConfig[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      logger.info('pdf.batch.generation.started', {
        batch_id: batchId,
        ticket_count: tickets.length
      });

      if (tickets.length === 0) {
        throw new Error('No tickets to export');
      }

      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 20,
        autoFirstPage: false,
        info: {
          Title: `Batch Tickets - ${batchId}`,
          Author: 'Express Ticket System',
          Subject: 'Batch Electronic Tickets',
          Keywords: 'ticket, e-ticket, QR code, batch'
        }
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        logger.info('pdf.batch.generation.success', {
          batch_id: batchId,
          ticket_count: tickets.length,
          pdf_size_bytes: pdfBuffer.length
        });
        resolve(pdfBuffer);
      });

      doc.on('error', (error: Error) => {
        logger.error('pdf.batch.generation.error', {
          batch_id: batchId,
          error: error.message
        });
        reject(error);
      });

      // 暂时使用英文标题（中文字体支持待后续优化）
      const useChineseTitle = false;

      // 为每张票生成一页
      tickets.forEach((ticket, index) => {
        doc.addPage();
        renderTicketPage(doc, {
          ticketCode: ticket.ticketCode,
          qrImageBase64: ticket.qrImageBase64,
          useChineseTitle,
          pageNumber: index + 1,
          totalPages: tickets.length
        });
      });

      doc.end();

    } catch (error) {
      logger.error('pdf.batch.generation.failed', {
        batch_id: batchId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      reject(error);
    }
  });
}

/**
 * 生成单张票券 PDF 流
 *
 * 用于流式 ZIP 导出，避免整个 PDF 存入内存。
 * 返回 PassThrough 流，可直接 pipe 到 archiver。
 *
 * @param ticketCode 票券代码
 * @param qrImageBase64 QR 码 Base64 图片
 * @returns PassThrough 流
 */
export function generateTicketPDFStream(
  ticketCode: string,
  qrImageBase64: string
): PassThrough {
  const passThrough = new PassThrough();

  const doc = new PDFDocument({
    size: [PAGE_WIDTH, PAGE_HEIGHT],
    margin: 20,
    info: {
      Title: `E-Ticket - ${ticketCode}`,
      Author: 'Express Ticket System',
      Subject: 'Electronic Ticket',
      Keywords: 'ticket, e-ticket, QR code'
    }
  });

  // pipe PDF 输出到 PassThrough 流
  doc.pipe(passThrough);

  // 渲染票券页面
  renderTicketPage(doc, {
    ticketCode,
    qrImageBase64,
    useChineseTitle: false
  });

  // 结束 PDF 文档
  doc.end();

  return passThrough;
}
