from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import whois
from datetime import datetime
import re
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import io
import os
import platform
import shutil
import time
import hashlib
from urllib.parse import urlparse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

custom_tesseract = os.getenv("TESSERACT_CMD")

if custom_tesseract:
    pytesseract.pytesseract.tesseract_cmd = custom_tesseract
else:
    if platform.system() == "Windows":
        windows_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(windows_path):
            pytesseract.pytesseract.tesseract_cmd = windows_path
    else:
        linux_tesseract = shutil.which("tesseract")
        if linux_tesseract:
            pytesseract.pytesseract.tesseract_cmd = linux_tesseract


class URLRequest(BaseModel):
    url: str


class TextRequest(BaseModel):
    text: str


CACHE_TTL_SECONDS = 60 * 10

whois_cache = {}
url_analysis_cache = {}
text_analysis_cache = {}

TRUSTED_DOMAINS = [
    "google.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "paypal.com",
    "github.com",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "x.com",
    "twitter.com",
    "whatsapp.com",
    "telegram.org",
    "openai.com",
    "vercel.com",
    "cloudflare.com",
    "gitlab.com",
    "dropbox.com",
    "adobe.com",
    "netflix.com",
    "discord.com",
    "slack.com",
]

TRUSTED_BRAND_DOMAINS = {
    "paypal": ["paypal.com"],
    "apple": ["apple.com"],
    "microsoft": ["microsoft.com", "live.com", "office.com", "outlook.com"],
    "google": ["google.com", "gmail.com", "youtube.com"],
    "amazon": ["amazon.com", "amazonaws.com"],
    "facebook": ["facebook.com", "fb.com", "messenger.com"],
    "instagram": ["instagram.com"],
    "whatsapp": ["whatsapp.com"],
    "telegram": ["telegram.org"],
    "github": ["github.com"],
    "bank": [],
    "visa": ["visa.com"],
    "mastercard": ["mastercard.com"],
    "netflix": ["netflix.com"],
}

CRITICAL_PHISHING_KEYWORDS = [
    "password", "otp", "verification code", "security code",
    "credit card", "bank account", "login", "sign in",
    "verify your account", "confirm your identity", "payment",
    "pay now", "refund", "update payment", "billing",
    "סיסמה", "קוד אימות", "קוד חד פעמי", "כרטיס אשראי",
    "חשבון בנק", "התחבר", "אימות", "אשר את זהותך",
    "תשלום", "שלם עכשיו", "עדכן פרטים", "חיוב"
]


def get_cache(cache: dict, key: str):
    item = cache.get(key)
    if not item:
        return None

    if time.time() - item["ts"] > CACHE_TTL_SECONDS:
        cache.pop(key, None)
        return None

    return item["value"]


def set_cache(cache: dict, key: str, value):
    cache[key] = {
        "ts": time.time(),
        "value": value
    }


def sha_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def extract_domain(url: str) -> str:
    parsed = urlparse(url if url.startswith(("http://", "https://")) else f"http://{url}")
    domain = parsed.netloc or url.replace("https://", "").replace("http://", "").split("/")[0]
    return domain.replace("www.", "").lower()


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


def is_trusted_domain(domain: str) -> bool:
    domain = domain.replace("www.", "").lower()
    return any(domain == trusted or domain.endswith(f".{trusted}") for trusted in TRUSTED_DOMAINS)


def brand_matches_legitimate_domain(brand: str, domain: str) -> bool:
    domain = domain.replace("www.", "").lower()
    allowed_domains = TRUSTED_BRAND_DOMAINS.get(brand, [])
    return any(domain == allowed or domain.endswith(f".{allowed}") for allowed in allowed_domains)


def extract_brand_hits(value: str):
    brands = list(TRUSTED_BRAND_DOMAINS.keys())
    lowered = value.lower()
    return [brand for brand in brands if brand in lowered]


def contains_critical_keyword(normalized_text: str) -> bool:
    return any(keyword.lower() in normalized_text for keyword in CRITICAL_PHISHING_KEYWORDS)


def check_domain_age(url: str):
    domain = extract_domain(url)
    cache_key = domain.lower()

    cached = get_cache(whois_cache, cache_key)
    if cached is not None:
        return cached

    try:
        w = whois.whois(domain)
        creation = w.creation_date

        if isinstance(creation, list):
            creation = creation[0]

        if creation is None:
            set_cache(whois_cache, cache_key, None)
            return None

        age_days = (datetime.now() - creation).days
        set_cache(whois_cache, cache_key, age_days)
        return age_days
    except:
        set_cache(whois_cache, cache_key, None)
        return None


def score_url(url: str):
    normalized_url_input = url.strip().lower()
    cache_key = sha_key(normalized_url_input)
    cached = get_cache(url_analysis_cache, cache_key)
    if cached is not None:
        return cached

    risk = 0
    reasons = []

    lower_url = normalized_url_input
    domain = extract_domain(url)

    if is_trusted_domain(domain):
        result = {
            "riskScore": 0,
            "status": "safe",
            "reasons": ["Trusted domain"]
        }
        set_cache(url_analysis_cache, cache_key, result)
        return result

    suspicious_words = [
        "login", "verify", "secure", "account", "bank", "update",
        "confirm", "password", "payment", "signin", "refund",
        "tax", "support", "alert", "security", "invoice", "wallet",
        "billing", "recovery", "unlock", "validate"
    ]

    suspicious_tlds = [
        ".xyz", ".top", ".click", ".shop", ".live", ".pw", ".sbs",
        ".buzz", ".monster", ".work", ".quest", ".rest", ".country"
    ]

    shorteners = [
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
        "rb.gy", "is.gd", "cutt.ly", "m-r.pw"
    ]

    age = check_domain_age(url)
    if age is not None and age < 30:
        risk += 35
        reasons.append("Domain was created recently")
    elif age is not None and age < 90:
        risk += 20
        reasons.append("Domain is relatively new")

    if "@" in lower_url:
        risk += 20
        reasons.append("URL contains suspicious character @")

    if len(lower_url) > 75:
        risk += 12
        reasons.append("URL is unusually long")

    if lower_url.startswith("http://"):
        risk += 18
        reasons.append("URL does not use HTTPS")

    found_words = [word for word in suspicious_words if word in lower_url]
    if found_words:
        risk += min(30, len(found_words) * 6)
        reasons.append("URL contains phishing-style keywords")

    if any(domain.endswith(tld) for tld in suspicious_tlds):
        risk += 18
        reasons.append("Domain uses a commonly abused TLD")

    hyphen_count = domain.count("-")
    if hyphen_count >= 2:
        risk += 15
        reasons.append("Domain contains multiple hyphens")
    elif hyphen_count == 1:
        risk += 8
        reasons.append("Domain contains a hyphen")

    dot_count = domain.count(".")
    if dot_count >= 3:
        risk += 12
        reasons.append("Domain contains many subdomains")

    if re.search(r'\d', domain):
        risk += 10
        reasons.append("Domain contains numeric characters")

    if any(shortener == domain or domain.endswith(f".{shortener}") for shortener in shorteners):
        risk += 20
        reasons.append("Domain is a shortened or redirect-style link")

    brand_hits = extract_brand_hits(domain)
    if brand_hits:
        for brand in brand_hits:
            if not brand_matches_legitimate_domain(brand, domain):
                risk += 25
                reasons.append(f"Domain references brand '{brand}' outside its legitimate domain")
                if found_words:
                    risk += 20
                    reasons.append("Brand name appears together with phishing keywords")

    lookalike_patterns = [
        r"paypa1", r"micr0soft", r"g00gle", r"app1e",
        r"faceb00k", r"amaz0n", r"instagrarn", r"te1egram"
    ]
    if any(re.search(pattern, domain) for pattern in lookalike_patterns):
        risk += 25
        reasons.append("Domain resembles a known brand using deceptive spelling")

    suspicious_path_patterns = [
        "/login", "/verify", "/signin", "/secure", "/account",
        "/update", "/payment", "/invoice", "/billing", "/confirm"
    ]
    if any(pattern in lower_url for pattern in suspicious_path_patterns):
        risk += 12
        reasons.append("URL path suggests credential or payment targeting")

    unique_reasons = []
    for reason in reasons:
        if reason not in unique_reasons:
            unique_reasons.append(reason)

    final_risk = max(0, min(risk, 100))

    result = {
        "riskScore": final_risk,
        "status": classify_risk(final_risk),
        "reasons": unique_reasons if unique_reasons else ["No obvious phishing indicators detected"]
    }

    set_cache(url_analysis_cache, cache_key, result)
    return result


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
    cache_key = sha_key(f"{mode}::{text.strip()}")
    cached = get_cache(text_analysis_cache, cache_key)
    if cached is not None:
        return cached

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

    brand_keywords = [
        "paypal", "apple", "microsoft", "google", "amazon",
        "facebook", "instagram", "whatsapp", "telegram", "github",
        "bank", "visa", "mastercard", "netflix",
        "פייפאל", "אפל", "מיקרוסופט", "גוגל", "אמזון",
        "פייסבוק", "אינסטגרם", "וואטסאפ", "טלגרם", "גיטהאב",
        "בנק", "ויזה", "מאסטרקארד", "נטפליקס"
    ]

    account_keywords = [
        "account suspended", "account locked", "account disabled",
        "verify your account", "confirm your identity", "security alert",
        "חשבון נחסם", "החשבון ייחסם", "החשבון הושעה",
        "אמת את החשבון", "אשר את זהותך", "התראת אבטחה"
    ]

    refund_keywords = [
        "refund available", "claim your refund", "tax refund", "payment failed",
        "החזר זמין", "קבל את ההחזר", "החזר מס", "התשלום נכשל"
    ]

    attachment_keywords = [
        ".html", ".htm", ".zip", ".rar", ".exe", ".docm", ".xlsm"
    ]

    shorteners = [
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
        "m-r.pw", "rb.gy", "is.gd", "cutt.ly"
    ]

    security_notice_keywords = [
        "security log", "recently authorized", "authorized to access your account",
        "permissions", "for more information", "contact support", "visit",
        "security event", "security events",
        "יומן אבטחה", "מורשה לאחרונה", "הרשאה לחשבון", "פרטי אבטחה"
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
    risk = add_category_score(original_text, normalized, brand_keywords, 10, "Known brand or institution mentioned", reasons, risk)
    risk = add_category_score(original_text, normalized, account_keywords, 18, "Account compromise language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, refund_keywords, 18, "Refund/payment failure language detected", reasons, risk)
    risk = add_category_score(original_text, normalized, attachment_keywords, 12, "Potentially risky attachment reference detected", reasons, risk)

    if mode == "message":
        risk = add_category_score(original_text, normalized, delivery_keywords, 18, "Delivery-related lure detected", reasons, risk)

    risk = add_category_score(original_text, normalized, promo_keywords, 12, "Prize/promotional language detected", reasons, risk)

    urls = extract_urls(original_text)
    has_link = len(urls) > 0

    trusted_link_count = 0
    untrusted_link_count = 0
    suspicious_embedded_link_count = 0
    dangerous_embedded_link_count = 0

    if urls:
        risk += 15
        reasons.append(f"Contains {len(urls)} link(s)")

        for url in urls[:5]:
            lower_url = url.lower()
            normalized_url = url if lower_url.startswith("http") else f"http://{url}"
            linked_domain = extract_domain(normalized_url)

            url_result = score_url(normalized_url)
            url_risk = url_result["riskScore"]
            url_status = url_result["status"]

            if is_trusted_domain(linked_domain):
                trusted_link_count += 1
            else:
                untrusted_link_count += 1

            if url_status == "dangerous":
                dangerous_embedded_link_count += 1
                risk += 35
                reasons.append(f"Embedded link looks dangerous: {linked_domain}")
            elif url_status == "suspicious":
                suspicious_embedded_link_count += 1
                risk += 20
                reasons.append(f"Embedded link looks suspicious: {linked_domain}")
            elif url_status == "safe" and is_trusted_domain(linked_domain):
                reasons.append(f"Embedded link points to a trusted domain: {linked_domain}")

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

            if not is_trusted_domain(linked_domain):
                age = check_domain_age(normalized_url)
                if age is not None and age < 30:
                    risk += 15
                    reasons.append("Linked domain appears newly registered")

            if url_risk >= 70:
                risk += 10
            elif url_risk >= 40:
                risk += 5

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
    has_urgency = any(word in normalized or word in original_text for word in urgency_keywords)
    has_action = any(word in normalized or word in original_text for word in action_keywords)
    has_credentials = any(word in normalized or word in original_text for word in credential_keywords)
    has_brand = any(word in normalized or word in original_text for word in brand_keywords)
    has_threat = any(word in normalized or word in original_text for word in threat_keywords)
    has_critical = contains_critical_keyword(normalized)
    has_security_notice = any(word in normalized or word in original_text for word in security_notice_keywords)

    if mode == "message" and has_transport and has_payment and has_link:
        risk += 30
        reasons.append("Classic transport-debt phishing pattern detected")

    if mode == "message" and has_tax and has_link:
        risk += 30
        reasons.append("Classic tax-refund phishing pattern detected")

    if mode == "message" and has_debt and has_link:
        risk += 25
        reasons.append("Classic debt-payment phishing pattern detected")

    if mode == "email" and has_brand and has_action:
        risk += 18
        reasons.append("Brand name appears together with action request")

    if mode == "email" and has_urgency and has_action and has_link:
        risk += 20
        reasons.append("Urgency + link + action request is a common phishing pattern")

    if mode == "email" and has_credentials and has_link:
        risk += 20
        reasons.append("Credential request combined with a link is highly suspicious")

    if mode == "email" and has_threat and has_link:
        risk += 15
        reasons.append("Threat language combined with a link is suspicious")

    if mode == "email" and dangerous_embedded_link_count > 0:
        risk += 15
        reasons.append("At least one embedded link was classified as dangerous")

    if mode == "email" and suspicious_embedded_link_count > 1:
        risk += 10
        reasons.append("Multiple embedded links were classified as suspicious")

    # False-positive reduction for legitimate security notifications
    if mode == "email":
        if trusted_link_count > 0 and untrusted_link_count == 0 and dangerous_embedded_link_count == 0:
            risk -= 18
            reasons.append("All detected links point to trusted domains")

        if has_security_notice and trusted_link_count > 0 and not has_payment and not has_debt and dangerous_embedded_link_count == 0:
            risk -= 20
            reasons.append("Looks like a legitimate security notification")

        if has_brand and trusted_link_count > 0 and not has_critical and not has_payment and dangerous_embedded_link_count == 0:
            risk -= 15
            reasons.append("Brand mention appears together with trusted links only")

        if "github" in normalized and trusted_link_count > 0 and "github.com" in original_text.lower() and dangerous_embedded_link_count == 0:
            risk -= 15
            reasons.append("GitHub-related trusted links detected")

        if not has_critical and trusted_link_count > 0 and untrusted_link_count == 0 and dangerous_embedded_link_count == 0:
            risk -= 10
            reasons.append("No critical phishing keywords detected alongside trusted links")

    if risk == 0:
        reasons.append("No obvious phishing indicators detected")

    unique_reasons = []
    for reason in reasons:
        if reason not in unique_reasons:
            unique_reasons.append(reason)

    final_risk = max(0, min(risk, 100))

    result = {
        "riskScore": final_risk,
        "status": classify_risk(final_risk),
        "reasons": unique_reasons
    }

    set_cache(text_analysis_cache, cache_key, result)
    return result


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


@app.get("/")
def healthcheck():
    return {"status": "ok", "service": "ScamGuard API"}


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