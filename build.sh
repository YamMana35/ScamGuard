#!/usr/bin/env bash
apt-get update
apt-get install -y tesseract-ocr tesseract-ocr-heb tesseract-ocr-eng
pip install -r backend/requirements.txt