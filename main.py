#!/usr/bin/env python3
"""
Main Orchestrator for SE Research Agent System
Manages the complete research workflow for multiple agents using browser-use
"""
import os
import sys
import json
import asyncio
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Import local modules
from config import (
    AGENTS_CONFIG_FILE,
    OUTPUT_DIR,
    LOGS_DIR,
    OPENAI_API_KEY
)
from research_agent import SEResearchAgent


class SEResearchOrchestrator:
    """Orchestrates the complete SE research workflow"""
    
    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in .env file")
        
        self.research_agent = SEResearchAgent(model="gpt-4o")
        self.log_file = LOGS_DIR / f"research_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
    def log(self, message: str):
        """Log message to console and file"""
        print(message)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"{datetime.now().isoformat()} - {message}\n")
    
    def load_agents_config(self) -> list:
        """Load the list of agents to research from config file"""
        try:
            with open(AGENTS_CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Filter only pending agents and sort by priority
            pending_agents = [
                agent for agent in config 
                if agent.get("status") == "pending"
            ]
            pending_agents.sort(key=lambda x: x.get("priority", 999))
            
            return pending_agents
        except Exception as e:
            self.log(f"Error loading agents config: {str(e)}")
            return []
    
    def update_agent_status(self, agent_id: int, status: str):
        """Update agent status in config file"""
        try:
            with open(AGENTS_CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            for agent in config:
                if agent.get("id") == agent_id:
                    agent["status"] = status
                    agent["last_updated"] = datetime.now().isoformat()
                    break
            
            with open(AGENTS_CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2)
                
        except Exception as e:
            self.log(f"Error updating agent status: {str(e)}")
    
    async def process_agent(self, agent_config: dict) -> dict:
        """Process a single agent research task"""
        agent_id = agent_config.get("id")
        agent_name = agent_config.get("agent_name")
        
        self.log(f"\n{'='*80}")
        self.log(f"Processing: {agent_name} (ID: {agent_id})")
        self.log(f"{'='*80}\n")
        
        # Update status to in-progress
        self.update_agent_status(agent_id, "in-progress")
        
        try:
            # Conduct research using browser-use agent
            self.log(f"🔍 Starting research for {agent_name}...")
            result = await self.research_agent.research_agent(agent_name)
            
            # Check if result contains error
            if "Error" in result:
                self.log(f" Research failed: {result.get('Error')}")
                self.update_agent_status(agent_id, "failed")
                return {
                    "agent_name": agent_name,
                    "status": "failed",
                    "error": result.get("Error")
                }
            
            # Success
            self.update_agent_status(agent_id, "completed")
            self.log(f"\n Successfully completed research for {agent_name}")
            
            output_file = OUTPUT_DIR / f"{agent_name.replace(' ', '_')}.json"
            return {
                "agent_name": agent_name,
                "status": "completed",
                "output_file": str(output_file)
            }
            
        except Exception as e:
            self.log(f"❌ Error processing {agent_name}: {str(e)}")
            self.update_agent_status(agent_id, "failed")
            return {
                "agent_name": agent_name,
                "status": "failed",
                "error": str(e)
            }
    
    async def run_batch(self, max_agents: int = None):
        """Run research for a batch of agents"""
        self.log("\n" + "="*80)
        self.log("SE RESEARCH AGENT SYSTEM - BATCH EXECUTION")
        self.log("="*80 + "\n")
        
        # Load agents to process
        agents_to_process = self.load_agents_config()
        
        if max_agents:
            agents_to_process = agents_to_process[:max_agents]
        
        if not agents_to_process:
            self.log("No pending agents found in configuration.")
            return
        
        self.log(f"Found {len(agents_to_process)} agent(s) to research:")
        for agent in agents_to_process:
            self.log(f"  - {agent.get('agent_name')} (Priority: {agent.get('priority')})")
        
        self.log("\nStarting batch processing...\n")
        
        # Process agents sequentially
        results = []
        for idx, agent_config in enumerate(agents_to_process, 1):
            self.log(f"\n{'#'*80}")
            self.log(f"# Agent {idx}/{len(agents_to_process)}")
            self.log(f"{'#'*80}\n")
            
            result = await self.process_agent(agent_config)
            results.append(result)
            
            # Pause between agents
            if idx < len(agents_to_process):
                pause_time = 10
                self.log(f"\nPausing for {pause_time} seconds before next agent...")
                await asyncio.sleep(pause_time)
        
        # Summary
        self.log("\n" + "="*80)
        self.log("BATCH EXECUTION SUMMARY")
        self.log("="*80 + "\n")
        
        completed = sum(1 for r in results if r.get("status") == "completed")
        failed = sum(1 for r in results if r.get("status") == "failed")
        
        self.log(f"Total Agents Processed: {len(results)}")
        self.log(f"Completed: {completed}")
        self.log(f"Failed: {failed}")
        
        # Save summary
        summary_file = OUTPUT_DIR / f"batch_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        self.log(f"\nBatch summary saved to: {summary_file}")
        self.log(f"Log file: {self.log_file}")


async def main():
    """Main entry point
    
    Usage:
        python main.py                          # Process all pending agents
        python main.py 1                        # Process up to 1 pending agent
        python main.py "Amazon Q Developer"     # Research a specific agent by name
    """
    import argparse
    load_dotenv()

    parser = argparse.ArgumentParser(description="SE Research Agent Orchestrator")
    parser.add_argument(
        "target",
        nargs="?",
        default=None,
        help="Agent name (string) to research, or max number of pending agents to process"
    )
    args = parser.parse_args()

    try:
        orchestrator = SEResearchOrchestrator()
    except ValueError as e:
        print(f"ERROR: {e}")
        print("Please create a .env file with your OPENAI_API_KEY")
        sys.exit(1)

    # Determine mode: specific agent name, numeric batch limit, or full batch
    if args.target is not None:
        try:
            max_agents = int(args.target)
            print(f"Processing up to {max_agents} pending agent(s)")
            await orchestrator.run_batch(max_agents=max_agents)
        except ValueError:
            # It's an agent name — ensure it's in agents_config and run it
            agent_name = args.target
            orchestrator.log(f"Target agent: {agent_name}")

            # Load config and find/add the agent
            try:
                with open(AGENTS_CONFIG_FILE, "r", encoding="utf-8") as f:
                    config = json.load(f)
            except Exception:
                config = []

            entry = next((a for a in config if a.get("agent_name") == agent_name), None)
            if not entry:
                new_id = max((a.get("id", 0) for a in config), default=0) + 1
                entry = {
                    "id": new_id,
                    "agent_name": agent_name,
                    "status": "pending",
                    "priority": 1,
                    "notes": f"Added via CLI at {datetime.now().isoformat()}"
                }
                config.append(entry)
                with open(AGENTS_CONFIG_FILE, "w", encoding="utf-8") as f:
                    json.dump(config, f, indent=2)
                orchestrator.log(f"Added '{agent_name}' to agents_config.json")
            elif entry.get("status") == "completed":
                # Reset to pending so it gets re-run
                entry["status"] = "pending"
                with open(AGENTS_CONFIG_FILE, "w", encoding="utf-8") as f:
                    json.dump(config, f, indent=2)
                orchestrator.log(f"Reset '{agent_name}' to pending for re-run")

            await orchestrator.process_agent(entry)
    else:
        await orchestrator.run_batch(max_agents=None)


if __name__ == "__main__":
    asyncio.run(main())
