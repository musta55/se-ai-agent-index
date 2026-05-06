"""
Configuration settings for the SE Research Agent System
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs"
EVIDENCE_DIR = BASE_DIR / "evidence"
LOGS_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
OUTPUT_DIR.mkdir(exist_ok=True)
EVIDENCE_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# API Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
BROWSERUSE_API_KEY = os.getenv("BROWSERUSE_API_KEY", "")

# Browser-use configuration
BROWSER_HEADLESS = True
BROWSER_TIMEOUT = 30000  # milliseconds
MAX_RETRIES = 3

# Research configuration
AGENTS_CONFIG_FILE = BASE_DIR / "agents_config.json"
RESEARCH_PROMPT_FILE = BASE_DIR / "research_prompt.md"

# Output configuration
MAX_ISSUES_TO_ANALYZE = 10
MIN_EVIDENCE_QUOTES = 1
MAX_EVIDENCE_QUOTES = 10

# Citation configuration
CITATION_DATE_FORMAT = "%Y-%m-%d"
