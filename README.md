# SE Research Agent System

Automated research system for analyzing Software Engineering practices of AI coding agents using **browser-use** with **OpenAI GPT-4**.

## Overview

This system uses browser-use (AI web browsing framework) with OpenAI to automatically:

1. Search for AI agent repositories and documentation
2. Extract Software Engineering practices across 7 key areas
3. Generate structured JSON reports with verbatim quotes and citations
4. Process 50 agents in batch mode

## Features

- ✅ **Automated Web Research** - browser-use navigates GitHub, documentation, and issues
- ✅ **Verbatim Quote Extraction** - Exact quotes from sources, not paraphrased
- ✅ **7 SE Practice Areas** - Testing, CI/CD, Code Review, Bug Solving, Methodology, Communication, LLM Integration
- ✅ **Batch Processing** - Process multiple agents sequentially with progress tracking
- ✅ **Citation Tracking** - All claims linked to source URLs
- ✅ **JSON Output** - Structured, validated data for analysis

## Quick Start

### 1. Prerequisites

- Python 3.8 or higher
- OpenAI API key

### 2. Installation

Run the setup script:

```bash
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all dependencies (browser-use, OpenAI, Playwright)
- Download Playwright browsers
- Create `.env` file from template

### 3. Configuration

Edit `.env` and add your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-key-here
```

### 4. Test Single Agent

Activate the virtual environment and run a test:

```bash
source venv/bin/activate
python test_single.py
```

This will research "Amazon Q Developer" and save results to `outputs/Amazon_Q_Developer.json`

### 5. Batch Processing

Process all pending agents from config:

```bash
python main.py
```

Or limit to first N agents:

```bash
python main.py 5  # Process first 5 agents
```

## Project Structure

```
SE Indexing Tool/
├── research_agent.py      # Main research agent using browser-use
├── research_prompt.md     # Research instructions for the AI
├── config.py              # Configuration and settings
├── main.py                # Batch orchestrator
├── test_single.py         # Single agent test script
├── setup.sh               # Automated setup script
├── requirements.txt       # Python dependencies
├── .env                   # API keys (create from .env.example)
├── agents_config.json     # List of agents to research
├── outputs/               # Research results (JSON files)
├── logs/                  # Execution logs
└── archive/               # Old implementation backups
```

## Configuration Files

### agents_config.json

Lists agents to research with priorities:

```json
[
  {
    "id": 1,
    "agent_name": "Amazon Q Developer",
    "priority": 1,
    "status": "pending"
  }
]
```

**Status values:**
- `pending` - Not yet researched
- `in-progress` - Currently being researched
- `completed` - Successfully completed
- `failed` - Research failed

### research_prompt.md

Research methodology and output schema. Includes:
- 7 SE practice areas to analyze
- Verbatim quote extraction requirements
- JSON output format specification
- Anti-hallucination guidelines

## Output Format

Each agent research produces a JSON file with this structure:

```json
{
  "Agent_Name": "Amazon Q Developer",
  "Repository_Statistics": {
    "Repository_URL": "https://github.com/...",
    "Stars": 1234,
    "Forks": 567,
    "Primary_Language": "Python",
    "Contributors": 89
  },
  "SE_Practices": {
    "Testing_and_Reliability": {
      "Summary": "Overview of testing practices",
      "Practices": [
        {
          "Practice": "Unit Testing",
          "Description": "How they test",
          "Evidence": [
            {
              "Quote": "Exact verbatim quote from source",
              "Citation": "[1]"
            }
          ]
        }
      ]
    },
    "Code_Integration_and_Review": { /* ... */ },
    "Bug_Solving_and_Debugging": { /* ... */ },
    "Development_Methodology": { /* ... */ },
    "Team_Communication_and_Collaboration": { /* ... */ },
    "LLM_Integration_and_AI_Features": { /* ... */ }
  },
  "References": [
    "https://github.com/.../CONTRIBUTING.md"
  ]
}
```

## Managing Agents

Use `manage_agents.py` to update agent statuses:

```bash
# View all agents
python manage_agents.py list

# Reset agent status
python manage_agents.py reset 1

# Mark as pending
python manage_agents.py pending 1
```

## Research Quality

The system enforces these quality rules:

1. **Verbatim Quotes Only** - No paraphrasing or summarization
2. **SE Practices, Not Features** - Focus on *how* they develop, not what the product does
3. **Evidence Required** - Every claim backed by quote + citation
4. **Correct Repository** - Verifies repo matches agent name

## Costs

OpenAI API costs (GPT-4o):
- ~$0.15-0.30 per agent (depends on sources found)
- ~$7.50-15 for 50 agents batch

## Troubleshooting

### "OPENAI_API_KEY not found"
- Make sure `.env` file exists in project root
- Verify API key is in format: `OPENAI_API_KEY=sk-...`

### Browser-use fails
- Run `playwright install chromium`
- Check internet connection
- Verify OpenAI API has credits

### Incomplete JSON output
- Check `logs/` folder for error details
- Raw output saved to `*_raw.txt` files

## Advanced Usage

### Custom Models

Change the OpenAI model in `research_agent.py`:

```python
agent = SEResearchAgent(model="gpt-4-turbo")  # Cheaper
agent = SEResearchAgent(model="gpt-4o")       # Default, balanced
```

### Adjust Research Depth

Edit `research_prompt.md` to modify:
- Number of practice areas
- Evidence requirements (currently 2-3 per area)
- Quote length preferences

## Archive

Previous Gemini-based implementation is archived in:
- `archive/old_gemini_implementation/` - Custom Playwright scraper
- `archive/test_files/` - Test scripts
- `archive/old_outputs/` - Previous results

## License

Research use only. See individual AI agent licenses for their respective terms.
