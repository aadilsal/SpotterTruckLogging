"""Server-side rendering of the stored daily-log SVGs into PDF.

Uses svglib + reportlab rather than cairosvg/weasyprint so there are no native
library dependencies to install on the host.
"""
import io

from reportlab.graphics import renderPDF
from reportlab.lib.pagesizes import landscape, letter
from reportlab.pdfgen import canvas
from svglib.svglib import svg2rlg

PAGE_SIZE = landscape(letter)
MARGIN = 20


class LogPdfError(Exception):
    """Raised when a daily log cannot be turned into a PDF page."""


def _drawing_from_svg(svg_content: str):
    if not svg_content or not svg_content.strip():
        raise LogPdfError('This daily log has no rendered log sheet to export.')

    drawing = svg2rlg(io.BytesIO(svg_content.encode('utf-8')))
    if drawing is None:
        raise LogPdfError('The stored log sheet could not be parsed as SVG.')
    return drawing


def _fit_to_page(drawing):
    """Scale the drawing to fit inside the page margins, keeping aspect ratio."""
    if not drawing.width or not drawing.height:
        return drawing

    factor = min(
        (PAGE_SIZE[0] - 2 * MARGIN) / drawing.width,
        (PAGE_SIZE[1] - 2 * MARGIN) / drawing.height,
    )
    drawing.width *= factor
    drawing.height *= factor
    drawing.scale(factor, factor)
    return drawing


def render_logs_pdf(daily_logs, title: str = 'Drivers Daily Log') -> bytes:
    """Render one PDF page per daily log, in the order given."""
    logs = list(daily_logs)
    if not logs:
        raise LogPdfError('There are no daily logs to export for this trip.')

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=PAGE_SIZE)
    pdf.setTitle(title)
    pdf.setAuthor('SpotterTruckLogger')
    pdf.setSubject('FMCSA Record of Duty Status')

    for log in logs:
        drawing = _fit_to_page(_drawing_from_svg(log.svg_content))
        x = (PAGE_SIZE[0] - drawing.width) / 2
        y = (PAGE_SIZE[1] - drawing.height) / 2
        renderPDF.draw(drawing, pdf, x, y)
        pdf.showPage()

    pdf.save()
    return buffer.getvalue()


def log_pdf_filename(trip_id: int, log_date=None) -> str:
    if log_date is not None:
        return f'eld-log-trip-{trip_id}-{log_date:%Y-%m-%d}.pdf'
    return f'eld-logs-trip-{trip_id}.pdf'
