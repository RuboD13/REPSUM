#!/usr/bin/env python3
"""
REPSUM — Sidecar de extracción de facturas
==========================================
Recibe JSON por stdin, devuelve JSON por stdout.

Entrada:  {"action": "extract", "file": "/ruta/al/archivo.pdf"}
Salida:   {
            "comercializadora": str | null,
            "tipo_suministro": "luz"|"agua"|"gas"|"internet"|"comunidad"|"otro"|null,
            "periodo_inicio": "YYYY-MM-DD" | null,
            "periodo_fin":   "YYYY-MM-DD" | null,
            "importe": float | null,
            "confianza": 0.0 - 1.0,
            "error": str | null
          }

Dependencias:
  pip install pdfplumber pytesseract pillow
  Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki
  (Windows: instalar con datos de idioma español 'spa')

NOTA Fase 7: compilar con PyInstaller para bundling:
  pyinstaller --onefile extractor.py
  Luego re-añadir en tauri.conf.json: "bundle.externalBin": ["sidecar/extractor"]
"""

import sys
import json
import re
import os
from datetime import datetime
from pathlib import Path

# ── Importaciones opcionales (degradación elegante si no están instaladas) ────

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    from PIL import Image
    import pytesseract
    HAS_TESSERACT = True
    # En Windows, pytesseract busca el exe; ajustar si no está en PATH
    if sys.platform == "win32":
        # 1. Primero buscar Tesseract bundleado (relativo al script)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        bundled_candidates = [
            os.path.join(script_dir, "tesseract", "tesseract.exe"),
            os.path.join(script_dir, "..", "tesseract", "tesseract.exe"),
        ]
        # 2. Luego buscar Tesseract en el directorio de la app (si está compilado)
        try:
            import sys
            app_dir = os.path.dirname(sys.executable)
            bundled_candidates.append(os.path.join(app_dir, "tesseract", "tesseract.exe"))
            bundled_candidates.append(os.path.join(app_dir, "sidecar", "tesseract", "tesseract.exe"))
        except:
            pass
        # 3. Finalmente, buscar en las ubicaciones del sistema
        system_candidates = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]

        all_candidates = bundled_candidates + system_candidates
        for c in all_candidates:
            if os.path.exists(c):
                pytesseract.pytesseract.tesseract_cmd = c
                break
except ImportError:
    HAS_TESSERACT = False


# ── Diccionario de comercializadoras ─────────────────────────────────────────

COMERCIALIZADORAS = {
    "Endesa": {
        "nifs": ["A81948077", "B82846825"],
        "keywords": ["endesa", "endesa energía", "endesa energia"],
        "tipo_default": "luz",
    },
    "Iberdrola": {
        "nifs": ["A48010615", "A95075578"],
        "keywords": ["iberdrola", "iberdrola clientes", "iberdrola distribución"],
        "tipo_default": "luz",
    },
    "Naturgy": {
        "nifs": ["A08015497", "A61797536"],
        "keywords": ["naturgy", "gas natural fenosa", "gas natural"],
        "tipo_default": "gas",
    },
    "Repsol": {
        "keywords": ["repsol", "repsol electricidad", "repsol gas"],
        "tipo_default": "luz",
    },
    "Holaluz": {
        "keywords": ["holaluz"],
        "tipo_default": "luz",
    },
    "TotalEnergies": {
        "keywords": ["totalenergies", "total energies", "total direct energie"],
        "tipo_default": "luz",
    },
    "Movistar": {
        "nifs": ["A82018474"],
        "keywords": ["movistar", "telefónica", "telefonica"],
        "tipo_default": "internet",
    },
    "Vodafone": {
        "nifs": ["A62186556"],
        "keywords": ["vodafone"],
        "tipo_default": "internet",
    },
    "Orange": {
        "nifs": ["A82009197"],
        "keywords": ["orange", "france telecom"],
        "tipo_default": "internet",
    },
    "MásMóvil": {
        "keywords": ["másmóvil", "masmovil", "yoigo", "pepephone"],
        "tipo_default": "internet",
    },
    "Digi": {
        "keywords": ["digi", "digi mobil", "digi spain"],
        "tipo_default": "internet",
    },
    "Canal de Isabel II": {
        "nifs": ["A86488259"],
        "keywords": ["canal de isabel ii", "canal isabel ii", "cyii"],
        "tipo_default": "agua",
    },
    "Agbar": {
        "keywords": ["agbar", "aguas de barcelona", "aguas barcelona"],
        "tipo_default": "agua",
    },
    "Emasa": {
        "keywords": ["emasa", "empresa municipal de aguas"],
        "tipo_default": "agua",
    },
}

# Palabras clave por tipo de suministro
TIPO_KEYWORDS = {
    "luz": [
        "energía eléctrica", "energia electrica", "electricidad",
        "término de potencia", "termino de potencia", "kwh", "kw·h",
        "potencia contratada", "peaje de acceso",
    ],
    "gas": [
        "gas natural", "término fijo gas", "kwh gas", "m3", "m³",
        "gas licuado", "término variable gas",
    ],
    "agua": [
        "consumo m3", "consumo m³", "alcantarillado", "abastecimiento",
        "canon del agua", "suministro de agua", "metros cúbicos",
    ],
    "internet": [
        "fibra óptica", "fibra optica", "línea fija", "linea fija",
        "adsl", "tarifa plana", "pack", "tv+internet", "roaming",
        "datos móviles",
    ],
    "comunidad": [
        "cuota comunidad", "gastos comunidad", "derrama", "administrador de fincas",
        "junta de propietarios",
    ],
}


# ── Extracción de texto ───────────────────────────────────────────────────────

def extract_text_from_pdf(path: str) -> str:
    """Extrae texto de PDF con pdfplumber; si falla o está vacío, usa Tesseract."""
    text = ""
    if HAS_PDFPLUMBER:
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text + "\n"
        except Exception:
            pass

    if not text.strip() and HAS_TESSERACT:
        text = ocr_pdf_as_images(path)

    return text


def ocr_pdf_as_images(path: str) -> str:
    """Convierte PDF a imágenes y aplica Tesseract OCR."""
    if not HAS_TESSERACT:
        return ""
    try:
        # Requiere pdf2image + poppler
        from pdf2image import convert_from_path  # type: ignore
        pages = convert_from_path(path, dpi=200)
        text = ""
        for page in pages:
            text += pytesseract.image_to_string(page, lang="spa") + "\n"
        return text
    except Exception:
        return ""


def extract_text_from_image(path: str) -> str:
    """OCR directo sobre imagen."""
    if not HAS_TESSERACT:
        return ""
    try:
        img = Image.open(path)
        return pytesseract.image_to_string(img, lang="spa")
    except Exception:
        return ""


def get_text(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(path)
    elif ext in (".jpg", ".jpeg", ".png", ".tiff", ".bmp", ".webp"):
        return extract_text_from_image(path)
    return ""


# ── Clasificación ─────────────────────────────────────────────────────────────

def detect_comercializadora(text: str) -> tuple[str | None, str | None]:
    """Devuelve (nombre_comercializadora, tipo_default)."""
    text_lower = text.lower()
    for nombre, info in COMERCIALIZADORAS.items():
        for kw in info.get("keywords", []):
            if kw in text_lower:
                return nombre, info["tipo_default"]
        for nif in info.get("nifs", []):
            if nif in text:
                return nombre, info["tipo_default"]
    return None, None


def detect_tipo(text: str, tipo_hint: str | None = None) -> str | None:
    """Detecta tipo de suministro por keywords."""
    text_lower = text.lower()
    scores = {tipo: 0 for tipo in TIPO_KEYWORDS}
    for tipo, kws in TIPO_KEYWORDS.items():
        for kw in kws:
            if kw in text_lower:
                scores[tipo] += 1
    best = max(scores, key=scores.get)  # type: ignore
    if scores[best] > 0:
        return best
    return tipo_hint  # fallback al tipo por defecto de la comercializadora


def detect_periodo(text: str) -> tuple[str | None, str | None]:
    """
    Extrae periodo de facturación.
    Formatos soportados:
      - DD/MM/YYYY - DD/MM/YYYY
      - DD/MM/YYYY al DD/MM/YYYY
      - Del DD/MM/YYYY al DD/MM/YYYY
      - YYYY-MM-DD / YYYY-MM-DD
      - "Periodo: marzo 2026" → primer/último día del mes
    """
    # Patrón DD/MM/YYYY (suelto o con separadores)
    date_re = r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})"
    pairs = [
        r"(?:periodo|facturación|del?)\s*:?\s*" + date_re + r"\s*(?:al?|[-–—])\s*" + date_re,
        date_re + r"\s*(?:al?|[-–—/])\s*" + date_re,
    ]
    for pattern in pairs:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            groups = m.groups()
            try:
                if len(groups) == 6:
                    d1, m1, y1 = groups[0], groups[1], groups[2]
                    d2, m2, y2 = groups[3], groups[4], groups[5]
                    ini = f"{y1}-{m1.zfill(2)}-{d1.zfill(2)}"
                    fin = f"{y2}-{m2.zfill(2)}-{d2.zfill(2)}"
                    # Validar que son fechas reales
                    datetime.strptime(ini, "%Y-%m-%d")
                    datetime.strptime(fin, "%Y-%m-%d")
                    return ini, fin
            except ValueError:
                continue

    # Fallback: "mes año" → primer y último día del mes
    meses = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
        "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
        "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    }
    mes_re = r"(" + "|".join(meses.keys()) + r")\s+(?:de\s+)?(\d{4})"
    m = re.search(mes_re, text.lower())
    if m:
        try:
            mes_num = meses[m.group(1)]
            anio = int(m.group(2))
            import calendar
            ultimo = calendar.monthrange(anio, mes_num)[1]
            ini = f"{anio}-{mes_num:02d}-01"
            fin = f"{anio}-{mes_num:02d}-{ultimo:02d}"
            return ini, fin
        except Exception:
            pass

    return None, None


def detect_importe(text: str) -> float | None:
    """
    Extrae el importe total de la factura.
    Busca patrones como:
      "Total: 89,40 €", "Importe total 89.40€", "Total a pagar 89,40"
    """
    # Primero buscar cerca de keywords de total
    total_patterns = [
        r"(?:total\s*(?:a\s*pagar|factura|importe)?|importe\s*total)\s*:?\s*([\d\.,]+)\s*€?",
        r"(?:total|importe)\s*:?\s*€?\s*([\d\.,]+)",
        # Formato con € primero
        r"€\s*([\d\.,]+)",
        # Último recurso: número grande seguido de €
        r"([\d]{1,4}[,\.]\d{2})\s*€",
    ]
    for pattern in total_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for raw in reversed(matches):  # el último total suele ser el definitivo
            try:
                # Normalizar: "1.234,56" → 1234.56 o "1,234.56" → 1234.56
                val = raw.strip()
                if re.match(r"^\d{1,3}(\.\d{3})*(,\d{2})?$", val):
                    val = val.replace(".", "").replace(",", ".")
                elif re.match(r"^\d{1,3}(,\d{3})*(\.\d{2})?$", val):
                    val = val.replace(",", "")
                else:
                    val = val.replace(",", ".")
                amount = float(val)
                if 0.01 <= amount <= 99999:
                    return round(amount, 2)
            except ValueError:
                continue
    return None


def compute_confidence(result: dict) -> float:
    """Calcula un score de confianza 0-1 según cuántos campos se extrajeron."""
    fields = ["comercializadora", "tipo_suministro", "periodo_inicio", "periodo_fin", "importe"]
    found = sum(1 for f in fields if result.get(f) is not None)
    return round(found / len(fields), 2)


# ── Pipeline principal ────────────────────────────────────────────────────────

def empty_result(error: str | None = None) -> dict:
    return {
        "comercializadora": None,
        "tipo_suministro": None,
        "periodo_inicio": None,
        "periodo_fin": None,
        "importe": None,
        "confianza": 0.0,
        "error": error,
    }


def process(request: dict) -> dict:
    action = request.get("action")
    if action != "extract":
        return empty_result(f"Acción desconocida: {action}")

    file_path = request.get("file", "").strip()
    if not file_path:
        return empty_result("No se especificó ruta de archivo")

    if not os.path.exists(file_path):
        return empty_result(f"Archivo no encontrado: {file_path}")

    # Extraer texto
    text = get_text(file_path)
    if not text.strip():
        return empty_result(
            "No se pudo extraer texto del archivo. "
            "Asegúrate de tener pdfplumber y/o Tesseract OCR instalados."
        )

    # Clasificar
    comercializadora, tipo_hint = detect_comercializadora(text)
    tipo = detect_tipo(text, tipo_hint)
    periodo_ini, periodo_fin = detect_periodo(text)
    importe = detect_importe(text)

    result = {
        "comercializadora": comercializadora,
        "tipo_suministro": tipo,
        "periodo_inicio": periodo_ini,
        "periodo_fin": periodo_fin,
        "importe": importe,
        "error": None,
    }
    result["confianza"] = compute_confidence(result)
    return result


def main():
    try:
        raw = sys.stdin.read()
        request = json.loads(raw)
        result = process(request)
    except json.JSONDecodeError as e:
        result = empty_result(f"JSON inválido en entrada: {e}")
    except Exception as e:
        result = empty_result(f"Error inesperado: {e}")

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
