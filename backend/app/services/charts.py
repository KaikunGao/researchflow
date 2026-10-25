"""用 matplotlib 生成报告用的图表 PNG（中文字体自动回退）。"""

import io

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

plt.rcParams["font.sans-serif"] = [
    "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "Noto Sans CJK SC", "SimHei", "Arial Unicode MS", "DejaVu Sans",
]
plt.rcParams["axes.unicode_minus"] = False

NAVY = "#1e3a8a"
AMBER = "#d97706"
TEAL = "#0891b2"
VIOLET = "#7c3aed"
SLATE = "#64748b"
PALETTE = [NAVY, TEAL, AMBER, VIOLET, SLATE, "#dc2626", "#059669", "#db2777"]

Number = float | None


def _headroom(ax, values: list[Number], factor: float = 1.3) -> None:
    """给图例留出顶部空间：把 y 轴上限抬高到最大值的 factor 倍。"""
    valid = [v for v in values if v is not None]
    if not valid:
        return
    top, bottom = max(valid), min(valid)
    span = max(top - min(bottom, 0), 1e-9)
    ax.set_ylim(min(bottom, 0) - (0.05 * span if bottom < 0 else 0), min(bottom, 0) + span * factor)


def _style(ax, title: str, source: str) -> None:
    ax.set_title(title, fontsize=11, loc="left", pad=10, fontweight="bold")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.6)
    ax.tick_params(labelsize=8)
    ax.figure.text(0.01, 0.01, source, fontsize=7, color="#94a3b8")


def _save(fig) -> bytes:
    buf = io.BytesIO()
    fig.tight_layout(rect=(0, 0.04, 1, 1))
    fig.savefig(buf, format="png", dpi=160)
    plt.close(fig)
    return buf.getvalue()


def bar_line_chart(labels: list[str], values: list[Number], growth: list[Number], title: str, value_name: str, growth_name: str, source: str) -> bytes:
    fig, ax = plt.subplots(figsize=(6.4, 3.2))
    x = range(len(labels))
    ax.bar(x, [v if v is not None else 0 for v in values], color=NAVY, width=0.55, label=value_name)
    _headroom(ax, values)
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels, rotation=0 if len(labels) <= 8 else 30, ha="center" if len(labels) <= 8 else "right")
    ax2 = ax.twinx()
    ax2.plot(list(x), [g if g is not None else float("nan") for g in growth], color=AMBER, marker="o", markersize=3.5, linewidth=1.8, label=growth_name)
    ax2.axhline(0, color="#94a3b8", linewidth=0.6, linestyle=":")
    _headroom(ax2, growth)
    ax2.spines["top"].set_visible(False)
    ax2.tick_params(labelsize=8)
    ax2.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:.0f}%"))
    h1, l1 = ax.get_legend_handles_labels()
    h2, l2 = ax2.get_legend_handles_labels()
    ax.legend(h1 + h2, l1 + l2, fontsize=7.5, frameon=False, loc="upper left", ncol=2)
    _style(ax, title, source)
    return _save(fig)


def multi_line_chart(labels: list[str], series: list[tuple[str, list[Number]]], title: str, source: str, unit: str = "%") -> bytes:
    fig, ax = plt.subplots(figsize=(6.4, 3.2))
    x = list(range(len(labels)))
    for i, (name, values) in enumerate(series):
        ax.plot(x, [v if v is not None else float("nan") for v in values], color=PALETTE[i % len(PALETTE)], marker="o", markersize=3, linewidth=1.8, label=name)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=0 if len(labels) <= 8 else 30, ha="center" if len(labels) <= 8 else "right")
    if unit == "%":
        ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:.0f}%"))
    _headroom(ax, [v for _, vals in series for v in vals], factor=1.2)
    ax.legend(fontsize=7.5, frameon=False, ncol=min(4, len(series)), loc="upper left")
    _style(ax, title, source)
    return _save(fig)


def grouped_bar_chart(categories: list[str], series: list[tuple[str, list[Number]]], title: str, source: str, unit: str = "%") -> bytes:
    fig, ax = plt.subplots(figsize=(6.4, 3.2))
    n = max(1, len(series))
    width = 0.8 / n
    for i, (name, values) in enumerate(series):
        xs = [j + (i - (n - 1) / 2) * width for j in range(len(categories))]
        ax.bar(xs, [v if v is not None else 0 for v in values], width=width * 0.95, color=PALETTE[i % len(PALETTE)], label=name)
    ax.set_xticks(list(range(len(categories))))
    ax.set_xticklabels(categories, rotation=0 if len(categories) <= 6 else 30, ha="center" if len(categories) <= 6 else "right")
    if unit == "%":
        ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:.0f}%"))
    ax.axhline(0, color="#94a3b8", linewidth=0.6)
    _headroom(ax, [v for _, vals in series for v in vals], factor=1.2)
    ax.legend(fontsize=7.5, frameon=False, ncol=min(4, n), loc="upper left")
    _style(ax, title, source)
    return _save(fig)
