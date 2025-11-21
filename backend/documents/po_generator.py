from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from purchase_requests.models import PurchaseRequest
from datetime import datetime


def generate_purchase_order_pdf(request: PurchaseRequest, po_data: dict) -> BytesIO:
    """
    Generate Purchase Order PDF
    
    Args:
        request: PurchaseRequest instance
        po_data: Dictionary with PO data (vendor, items, etc.)
    
    Returns:
        BytesIO buffer with PDF content
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Title
    story.append(Paragraph("PURCHASE ORDER", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # PO Number and Date
    po_number = f"PO-{request.id.hex[:8].upper()}"
    po_date = datetime.now().strftime("%B %d, %Y")
    
    po_info_data = [
        ['PO Number:', po_number],
        ['Date:', po_date],
        ['Request ID:', str(request.id)]
    ]
    
    po_info_table = Table(po_info_data, colWidths=[2*inch, 4*inch])
    po_info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(po_info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Vendor Information
    vendor_name = po_data.get('vendor_name', 'N/A')
    vendor_address = po_data.get('vendor_address', '')
    vendor_email = po_data.get('vendor_email', '')
    
    vendor_data = [
        ['Vendor:', vendor_name],
        ['Address:', vendor_address],
        ['Email:', vendor_email]
    ]
    
    vendor_table = Table(vendor_data, colWidths=[1.5*inch, 4.5*inch])
    vendor_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(vendor_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Items Table
    items = po_data.get('items', [])
    items_data = [['Description', 'Quantity', 'Unit Price', 'Total']]
    
    for item in items:
        items_data.append([
            item.get('description', ''),
            str(item.get('quantity', 0)),
            f"${item.get('unit_price', 0):.2f}",
            f"${item.get('total', 0):.2f}"
        ])
    
    # Add total row
    total_amount = po_data.get('total_amount', request.amount)
    currency = po_data.get('currency', 'USD')
    items_data.append([
        'TOTAL',
        '',
        '',
        f"{currency} ${float(total_amount):.2f}"
    ])
    
    items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1.5*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Terms
    terms = po_data.get('terms', '')
    if terms:
        story.append(Paragraph(f"<b>Terms:</b> {terms}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Description
    story.append(Paragraph(f"<b>Description:</b> {request.description}", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

