import io

def extract_text_from_pdf(pdf_bytes: bytes, max_chars: int = 4000) -> str:
    """
    Extract readable text from uploaded PDF bytes safely with character limit.
    """
    if not pdf_bytes:
        return ""

    try:
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        except ImportError:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))

        extracted_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text.append(text.strip())
            if sum(len(t) for t in extracted_text) >= max_chars:
                break

        full_text = "\n\n".join(extracted_text)
        return full_text[:max_chars].strip()
    except Exception as e:
        return f"Could not read PDF contents: {str(e)[:100]}"
