/**
 * 把 Recharts 渲染的 SVG 导出为 PNG，并补上标题、图例与资料来源，
 * 使图片可以直接粘贴进点评或 PPT。
 */

export interface LegendEntry {
  label: string;
  color: string;
  shape?: "bar" | "line";
}

export interface ExportChartOptions {
  container: HTMLElement;
  fileName: string;
  title: string;
  subtitle?: string;
  legend: LegendEntry[];
  source?: string;
  scale?: number;
}

const FONT = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

export async function exportChartAsPng(options: ExportChartOptions): Promise<void> {
  // 图例图标也是 recharts-surface，取面积最大的那个才是主图
  const candidates = Array.from(options.container.querySelectorAll<SVGSVGElement>("svg.recharts-surface"));
  const svg = candidates
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0];
  if (!svg || svg.rect.width < 50) throw new Error("未找到图表 SVG，请等待图表渲染完成后重试。");

  const width = Math.round(svg.rect.width);
  const height = Math.round(svg.rect.height);
  const clone = svg.el.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.querySelectorAll("text").forEach((t) => t.setAttribute("font-family", FONT));
  clone.querySelectorAll(".recharts-tooltip-cursor, .recharts-active-dot").forEach((n) => n.remove());

  const xml = new XMLSerializer().serializeToString(clone);
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);

  const scale = options.scale ?? 2;
  const padding = 20;
  const headerHeight = options.subtitle ? 54 : 36;
  const legendHeight = options.legend.length > 0 ? 24 : 0;
  const footerHeight = options.source ? 24 : 8;
  const canvasWidth = width + padding * 2;
  const canvasHeight = headerHeight + height + legendHeight + footerHeight + padding;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持 Canvas 导出。");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#0f172a";
  ctx.font = `600 15px ${FONT}`;
  ctx.textBaseline = "top";
  ctx.fillText(options.title, padding, 14);
  if (options.subtitle) {
    ctx.fillStyle = "#64748b";
    ctx.font = `11px ${FONT}`;
    ctx.fillText(options.subtitle, padding, 36);
  }

  ctx.drawImage(image, padding, headerHeight, width, height);

  if (options.legend.length > 0) {
    let x = padding;
    const y = headerHeight + height + 6;
    ctx.font = `11px ${FONT}`;
    for (const entry of options.legend) {
      ctx.fillStyle = entry.color;
      if (entry.shape === "line") {
        ctx.fillRect(x, y + 5, 14, 2);
      } else {
        ctx.fillRect(x, y + 1, 10, 10);
      }
      x += entry.shape === "line" ? 18 : 14;
      ctx.fillStyle = "#334155";
      ctx.fillText(entry.label, x, y);
      x += ctx.measureText(entry.label).width + 16;
    }
  }

  if (options.source) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `10px ${FONT}`;
    ctx.fillText(options.source, padding, canvasHeight - footerHeight - 2);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("生成 PNG 失败。");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.fileName.endsWith(".png") ? options.fileName : `${options.fileName}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图表图像加载失败。"));
    img.src = src;
  });
}
