import sys
import os
import json
from pypdf import PdfReader

def extract_pdf_images(pdf_path, output_dir):
    try:
        reader = PdfReader(pdf_path)
        extracted = []
        os.makedirs(output_dir, exist_ok=True)
        
        for p_idx, page in enumerate(reader.pages):
            # Also extract direct text if present
            direct_text = page.extract_text() or ''
            if len(direct_text.strip()) > 30:
                return {"type": "text", "text": direct_text}
                
            for img_idx, img in enumerate(page.images):
                # Only keep images that are large enough (skip tiny icons/watermarks)
                if img.image.width > 200 and img.image.height > 200:
                    img_name = f"extracted_{os.path.basename(pdf_path)}_{p_idx}_{img_idx}.png"
                    img_path = os.path.join(output_dir, img_name)
                    img.image.save(img_path)
                    extracted.append(img_path)
                    
        return {"type": "images", "images": extracted}
    except Exception as e:
        return {"type": "error", "error": str(e)}

if __name__ == '__main__':
    if len(sys.argv) > 2:
        res = extract_pdf_images(sys.argv[1], sys.argv[2])
        print(json.dumps(res))
