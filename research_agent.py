"""
SE Research Agent using browser-use with OpenAI
Clean implementation for researching AI agent SE practices
"""
import json
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, Any
from collections import defaultdict
from urllib.parse import urlparse

from browser_use import Agent, Browser
from browser_use.llm.openai.chat import ChatOpenAI
from dotenv import load_dotenv
import os
import json

from config import (
    OPENAI_API_KEY,
    BROWSERUSE_API_KEY,
    OUTPUT_DIR,
    LOGS_DIR,
    RESEARCH_PROMPT_FILE
)

# Load environment variables
load_dotenv()


class SEResearchAgent:
    """Research agent for analyzing SE practices of AI coding agents"""
    
    def __init__(self, model: str = "gpt-4o"):
        """Initialize the research agent with OpenAI model
        
        Args:
            model: OpenAI model name
                   - gpt-4o: Flagship multimodal model (RECOMMENDED - works with browser-use)
                   - gpt-4o-mini: Cost-effective option
                   - o1-preview: Reasoning model for complex research
                   - o1-mini: Faster reasoning model
                   
        NOTE: o3 models (o3-deep-research, o3-pro, o3, o3-mini) use v1/responses API
              which is incompatible with browser-use's ChatOpenAI implementation.
              Use gpt-4o for best results with browser automation.
        """
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in .env file")
        
        if BROWSERUSE_API_KEY:
            os.environ["BROWSER_USE_API_KEY"] = BROWSERUSE_API_KEY
        
        self.model = model
        self.site_failures = defaultdict(int)  # Track failures per website domain
        self.checkpoint_interval = 25  # Save checkpoint every 25 steps
        self.max_failures_per_site = 5  # Maximum attempts per site before moving on
        
        # Configure model parameters based on model type
        # o1/o3 models don't support temperature parameter or system messages
        if model.startswith("o1") or model.startswith("o3"):
            self.llm = ChatOpenAI(
                model=model,
                api_key=OPENAI_API_KEY
                # o1/o3 models use fixed temperature=1, no need to specify
            )
        else:
            self.llm = ChatOpenAI(
                model=model,
                api_key=OPENAI_API_KEY,
                temperature=0.1
            )
        
        with open(RESEARCH_PROMPT_FILE, 'r') as f:
            self.research_prompt_template = f.read()
    
    def _save_checkpoint(self, agent_name: str, data: Dict[str, Any], step_num: int):
        """Save checkpoint of collected data
        
        Args:
            agent_name: Name of the agent being researched
            data: Current research data
            step_num: Current step number
        """
        checkpoint_file = LOGS_DIR / f"{agent_name.replace(' ', '_')}_checkpoint_{step_num}.json"
        with open(checkpoint_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"💾 Checkpoint saved: {checkpoint_file.name}")
    
    def _load_latest_checkpoint(self, agent_name: str) -> Dict[str, Any]:
        """Load the latest checkpoint if available
        
        Args:
            agent_name: Name of the agent being researched
            
        Returns:
            Latest checkpoint data or None
        """
        checkpoint_pattern = f"{agent_name.replace(' ', '_')}_checkpoint_*.json"
        checkpoints = list(LOGS_DIR.glob(checkpoint_pattern))
        
        if not checkpoints:
            return None
        
        # Sort by step number and get latest
        latest = max(checkpoints, key=lambda p: int(p.stem.split('_')[-1]))
        
        with open(latest, 'r') as f:
            data = json.load(f)
        
        print(f"📂 Loaded checkpoint: {latest.name}")
        return data
    
    def _track_site_failure(self, url: str) -> bool:
        """Track failure for a specific website domain
        
        Args:
            url: URL that failed
            
        Returns:
            True if should continue trying, False if limit exceeded
        """
        domain = urlparse(url).netloc
        self.site_failures[domain] += 1
        
        if self.site_failures[domain] >= self.max_failures_per_site:
            print(f"⚠️  Site failure limit reached for {domain} ({self.site_failures[domain]} failures)")
            print(f"   Moving to other sources or marking as 'Not Available'")
            return False
        
        return True
    
    async def research_agent(self, agent_name: str) -> Dict[str, Any]:
        """Research SE practices for a given AI agent"""
        print(f"\n{'='*70}")
        print(f"🔍 Researching: {agent_name}")
        print(f"💡 Model: {self.model}")
        print(f"💾 Checkpoints: Every {self.checkpoint_interval} steps")
        print(f"🚫 Max failures per site: {self.max_failures_per_site}")
        print(f"{'='*70}\n")
        
        # Check for existing checkpoint
        checkpoint_data = self._load_latest_checkpoint(agent_name)
        if checkpoint_data:
            print(f"✅ Resuming from checkpoint\n")
        
        research_task = self.research_prompt_template.replace("{agent_name}", agent_name)
        
        browser = Browser(headless=True)
        agent = Agent(
            task=research_task,
            llm=self.llm,
            browser=browser,
            max_actions_per_step=5,
            max_failures=3,
            max_steps=150
        )
        
        try:
            print("🌐 Starting browser-use agent...")
            result = await agent.run()
            result_text = str(result)
            
            try:
                if "```json" in result_text:
                    json_start = result_text.find("```json") + 7
                    json_end = result_text.find("```", json_start)
                    json_text = result_text[json_start:json_end].strip()
                elif "```" in result_text:
                    json_start = result_text.find("```") + 3
                    json_end = result_text.find("```", json_start)
                    json_text = result_text[json_start:json_end].strip()
                else:
                    json_text = result_text
                
                research_data = json.loads(json_text)
                
            except json.JSONDecodeError as e:
                print(f"⚠️  JSON parsing failed: {e}")
                print(f"🔄 Attempting to convert text output to JSON format...")
                log_file = LOGS_DIR / f"{agent_name.replace(' ', '_')}_raw.txt"
                with open(log_file, 'w') as f:
                    f.write(result_text)
                print(f"💾 Raw output saved to: {log_file}")
                
                # Try to convert text output to JSON using LLM
                try:
                    research_data = await self._convert_text_to_json(agent_name, result_text)
                    print(f"✅ Successfully converted text to JSON format")
                except Exception as conv_error:
                    print(f"❌ Conversion failed: {conv_error}")
                    research_data = {
                        "Agent_Name": agent_name,
                        "Error": "Failed to parse JSON output",
                        "Raw_Output_Path": str(log_file)
                    }
            
            output_file = OUTPUT_DIR / f"{agent_name.replace(' ', '_')}.json"
            with open(output_file, 'w') as f:
                json.dump(research_data, f, indent=2)
            
            print(f"\n✅ Research complete!")
            print(f"💾 Saved to: {output_file}\n")
            
            return research_data
            
        except Exception as e:
            print(f"\n❌ Error during research: {e}")
            error_log = LOGS_DIR / f"{agent_name.replace(' ', '_')}_error.txt"
            with open(error_log, 'w') as f:
                f.write(f"Error: {str(e)}\nTimestamp: {datetime.now()}\n")
            raise
    
    async def _convert_text_to_json(self, agent_name: str, text_output: str) -> Dict[str, Any]:
        """Convert text summary to required JSON format using LLM
        
        Args:
            agent_name: Name of the agent being researched
            text_output: Text summary from the browser-use agent
            
        Returns:
            Dict containing the properly formatted JSON data
        """
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        # Read the JSON schema from research_prompt.md
        with open(RESEARCH_PROMPT_FILE, 'r') as f:
            prompt_content = f.read()
        
        # Extract the JSON schema section
        schema_start = prompt_content.find('```json')
        schema_end = prompt_content.find('```', schema_start + 7)
        json_schema = prompt_content[schema_start + 7:schema_end].strip()
        
        conversion_prompt = f"""You are a data formatter. You have research data about "{agent_name}" in text format.
Convert this text data into the exact JSON schema provided below.

IMPORTANT RULES:
1. Use ONLY the data provided in the text - do not invent or hallucinate information
2. If data is missing for any field, use "Not Available" or empty arrays []
3. Preserve all URLs and citations exactly as they appear
4. Follow the JSON schema structure precisely
5. Output ONLY valid JSON, no explanatory text before or after

JSON SCHEMA TO FOLLOW:
{json_schema}

TEXT DATA TO CONVERT:
{text_output}

Output the complete JSON now:"""
        
        # Handle o1/o3 models differently (no system messages, no temperature)
        if self.model.startswith("o1") or self.model.startswith("o3"):
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": conversion_prompt}
                ]
            )
        else:
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a precise data formatter that converts text to JSON without hallucinating."},
                    {"role": "user", "content": conversion_prompt}
                ],
                temperature=0.1
            )
        
        json_text = response.choices[0].message.content.strip()
        
        # Extract JSON from markdown code blocks if present
        if "```json" in json_text:
            json_start = json_text.find("```json") + 7
            json_end = json_text.find("```", json_start)
            json_text = json_text[json_start:json_end].strip()
        elif "```" in json_text:
            json_start = json_text.find("```") + 3
            json_end = json_text.find("```", json_start)
            json_text = json_text[json_start:json_end].strip()
        
        return json.loads(json_text)
