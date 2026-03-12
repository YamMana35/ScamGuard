from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import whois
from datetime import datetime
import re
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


class URLRequest(BaseModel):
    url: str


class TextRequest(BaseModel):
    text: str


def classify_risk(risk: int) -> str:
    if risk < 30:
        return "safe"
    elif risk < 70:
        return "suspicious"
    return "dangerous"


def normalize_text(text: str) -> str:
    text = text.lower()
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_urls(text: str):
    pattern = r'((?:https?://)?(?:www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)'
    matches = re.findall(pattern, text, flags=re.IGNORECASE)
    return matches


def check_domain_age(url: str):
    try:
        domain = url.replace("https://", "").replace("http://", "").split("/")[0]
        w = whois.whois(domain)
        creation = w.creation_date

        if isinstance(creation, list):
            creation = creation[0]

        if creation is None:
            return None

        age_days = (datetime.now() - creation).days
        return age_days
    except:
        return None


def score_url(url: str):
    risk = 0
    reasons = []

    age = check_domain_age(url)
    if age is not None and age < 30:
        risk += 40
        reasons.append("Domain was created recently")

    if "@" in url:
        risk += 20
        reasons.append("URL contains suspicious character @")

    if len(url) > 75:
        risk += 10
        reasons.append("URL is unusually long")

    if url.startswith("http://"):
        risk += 15
        reasons.append("URL does not use HTTPS")

    suspicious_words = [
        "login", "verify", "secure", "account", "bank", "update",
        "confirm", "password", "payment", "signin", "refund",
        "tax", "support", "alert", "security", "invoice"
    ]
    found = [word for word in suspicious_words if word in url.lower()]
    if found:
        risk += min(30, len(found) * 6)
        reasons.append("URL contains suspicious phishing-style words")

    return {
        "riskScore": min(risk, 100),
        "status": classify_risk(risk),
        "reasons": reasons if reasons else ["No obvious phishing indicators detected"]
    }


def add_category_score(text_original: str, text_normalized: str, keywords, weight, label, reasons, current_risk):
    matched = []

    for keyword in keywords:
        if keyword.lower() in text_normalized or keyword in text_original:
            matched.append(keyword)

    if matched:
        current_risk += weight
        reasons.append(f"{label}: " + ", ".join(matched[:5]))

    return current_risk


def analyze_text_content(text: str, mode="email"):
    original_text = text
    normalized = normalize_text(text)

    risk = 0
    reasons = []

    urgency_keywords = [
        "urgent", "immediately", "act now", "final warning", "warning", "suspended",
        "דחוף", "מיידי", "מייד", "בדיקה מיידית", "פעל עכשיו", "אזהרה", "אזהרה אחרונה",
        "נחסם", "ייחסם", "יושעה"
    ]

    action_keywords = [
        "click here", "click", "tap", "verify", "confirm", "login", "sign in", "check now",
        "לחץ", "לחץ כאן", "לחצי", "לחצי כאן", "הקש כאן", "בדוק עכשיו", "לבדיקה", "אמת",
        "אימות", "אשר", "אישור", "התחבר"
    ]

    credential_keywords = [
        "password", "otp", "code", "verification code", "account", "bank account", "security code",
        "סיסמה", "קוד", "קוד אימות", "קוד חד פעמי", "חשבון", "חשבון בנק", "אשראי", "כרטיס", "פרטי אשראי"
    ]

    payment_keywords = [
        "payment", "pay now", "invoice", "billing", "credit card", "refund", "money", "debt", "charge",
        "תשלום", "שלם", "שלם עכשיו", "הסדרת תשלום", "הסדירו תשלום", "לתשלום", "חיוב",
        "חשבונית", "כרטיס אשראי", "כסף", "חוב", "יתרת חוב", "חוב פתוח", "שקל", "שקלים", "₪"
    ]

    threat_keywords = [
        "blocked", "locked", "disabled", "expired", "terminate", "legal action", "collections",
        "נחסם", "ייחסם", "ננעל", "פג תוקף", "יבוטל", "יופסק", "הוצאה לפועל", "גבייה",
        "הועבר לטיפול", "הליך משפטי", "טיפול משפטי"
    ]

    delivery_keywords = [
        "package", "delivery", "shipment", "post", "customs",
        "חבילה", "חבילה שלך", "משלוח", "מסירה", "דואר", "דמי משלוח", "מכס"
    ]

    promo_keywords = [
        "winner", "won", "prize", "lottery", "gift", "free", "offer", "deal",
        "זכית", "זוכה", "פרס", "הגרלה", "מתנה", "חינם", "מבצע", "הצעה"
    ]

    debt_keywords = [
        "debt", "collections", "legal action", "fine", "penalty", "outstanding balance",
        "חוב", "חוב עבור", "קיים חוב", "יתרת חוב", "חוב פתוח", "הוצאה לפועל",
        "קנס", "גבייה", "הועבר לטיפול", "הסדר תשלום"
    ]

    tax_keywords = [
        "tax refund", "refund", "tax authority", "claim refund",
        "החזרי מס", "החזר מס", "החזרים", "החזר", "מגיע לך החזר", "בדיקת החזר", "רשות המסים"
    ]

    transport_keywords = [
        "toll road", "road payment", "highway fine", "road fee",
        "כביש 6", "כביש 6 צפון", "אגרת", "אגרת כביש", "נסיעות בכביש 6", "חוב עבור נסיעות"
    ]

    government_keywords = [
        "government", "authority", "official notice",
        "משרד", "רשות", "הודעה רשמית", "הודעה מטעם", "גורם ממשלתי"
    ]

    shorteners = [
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
        "m-r.pw", "rb.gy", "is.gd", "cutt.ly"
    ]

    risk = add_category_score(original_text, normalized, urgency_keywords, 15, "Urgency language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, action_keywords, 14, "Action request detected", reasons, risk)
    risk = add_category_score(original_text, normalized, credential_keywords, 18, "Sensitive information request", reasons, risk)
    risk = add_category_score(original_text, normalized, payment_keywords, 18, "Payment-related language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, threat_keywords, 22, "Threat or legal pressure language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, debt_keywords, 24, "Debt-related scam language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, tax_keywords, 24, "Tax/refund scam language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, transport_keywords, 20, "Transport/toll scam language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, government_keywords, 12, "Authority/government style language detected", reasons, risk)

    if mode == "message":
        risk = add_category_score(original_text, normalized, delivery_keywords, 18, "Delivery-related lure detected", reasons, risk)

    risk = add_category_score(original_text, normalized, promo_keywords, 12, "Prize/promotional language detected", reasons, risk)

    urls = extract_urls(original_text)
    if urls:
        risk += 25
        reasons.append(f"Contains {len(urls)} link(s)")

        for url in urls[:3]:
            lower_url = url.lower()

            if any(shortener in lower_url for shortener in shorteners):
                risk += 25
                reasons.append("Contains shortened or suspicious redirect link")

            if "@" in url:
                risk += 15
                reasons.append("Link contains suspicious character @")

            if len(url) > 75:
                risk += 10
                reasons.append("Contains unusually long link")

            if lower_url.startswith("http://"):
                risk += 15
                reasons.append("Contains non-HTTPS link")

            normalized_url = url if lower_url.startswith("http") else f"http://{url}"
            age = check_domain_age(normalized_url)
            if age is not None and age < 30:
                risk += 15
                reasons.append("Linked domain appears newly registered")

    if re.search(r'\b\d{4,8}\b', original_text):
        risk += 6
        reasons.append("Contains numeric code or reference number")

    if re.search(r'(\$\d+|\d+\s?₪|\d+\s?nis|\d+\s?usd|\d+\.\d{1,2}\s?₪|\d+\.\d{1,2}|11,500)', normalized):
        risk += 12
        reasons.append("Contains money amount")

    has_debt = any(word in normalized or word in original_text for word in debt_keywords)
    has_tax = any(word in normalized or word in original_text for word in tax_keywords)
    has_transport = any(word in normalized or word in original_text for word in transport_keywords)
    has_payment = any(word in normalized or word in original_text for word in payment_keywords)
    has_link = len(urls) > 0

    if mode == "message" and has_transport and has_payment and has_link:
        risk += 30
        reasons.append("Classic transport-debt phishing pattern detected")

    if mode == "message" and has_tax and has_link:
        risk += 30
        reasons.append("Classic tax-refund phishing pattern detected")

    if mode == "message" and has_debt and has_link:
        risk += 25
        reasons.append("Classic debt-payment phishing pattern detected")

    if risk == 0:
        reasons.append("No obvious phishing indicators detected")

    unique_reasons = []
    for reason in reasons:
        if reason not in unique_reasons:
            unique_reasons.append(reason)

    final_risk = min(risk, 100)

    return {
        "riskScore": final_risk,
        "status": classify_risk(final_risk),
        "reasons": unique_reasons
    }


def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes))
    image = image.resize((image.width * 2, image.height * 2))
    image = image.convert("L")
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2)
    image = image.filter(ImageFilter.SHARPEN)

    text = pytesseract.image_to_string(
        image,
        lang="eng+heb",
        config="--psm 6"
    )
    return text.strip()


@app.post("/analyze")
def analyze(data: URLRequest):
    return score_url(data.url)


@app.post("/analyze-email")
def analyze_email(data: TextRequest):
    return analyze_text_content(data.text, mode="email")


@app.post("/analyze-message")
def analyze_message(data: TextRequest):
    return analyze_text_content(data.text, mode="message")


@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    mode: str = Form(...)
):
    image_bytes = await file.read()
    extracted_text = extract_text_from_image_bytes(image_bytes)

    if mode not in ["email", "message"]:
        mode = "message"

    analysis = analyze_text_content(extracted_text, mode=mode)

    return {
        "extractedText": extracted_text,
        "mode": mode,
        "riskScore": analysis["riskScore"],
        "status": analysis["status"],
        "reasons": analysis["reasons"]
    }