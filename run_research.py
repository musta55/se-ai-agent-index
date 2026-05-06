#!/usr/bin/env python3
"""
Generic research runner that reads from agents_config.json
No need to create individual test files for each agent!
"""
import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime
from research_agent import SEResearchAgent


def load_config():
    """Load agents configuration"""
    config_file = Path("agents_config.json")
    if not config_file.exists():
        print("❌ agents_config.json not found!")
        sys.exit(1)
    
    with open(config_file, 'r') as f:
        return json.load(f)


def save_config(config):
    """Save updated configuration"""
    with open("agents_config.json", 'w') as f:
        json.dump(config, f, indent=2)


def update_agent_status(agent_id, status, notes=None):
    """Update agent status in config"""
    config = load_config()
    
    for agent in config:
        if agent['id'] == agent_id:
            agent['status'] = status
            if notes:
                agent['notes'] = notes
            break
    
    save_config(config)


async def research_agent_by_id(agent_id: int, model: str = "gpt-4o"):
    """Research a specific agent by ID from config"""
    config = load_config()
    
    # Find agent
    target_agent = None
    for agent in config:
        if agent['id'] == agent_id:
            target_agent = agent
            break
    
    if not target_agent:
        print(f"❌ Agent ID {agent_id} not found in config!")
        return
    
    agent_name = target_agent['agent_name']
    
    print(f"\n{'='*70}")
    print(f"🚀 Starting research for: {agent_name}")
    print(f"📋 Agent ID: {agent_id}")
    print(f"🤖 Model: {model}")
    print(f"{'='*70}\n")
    
    # Update status to in_progress
    update_agent_status(agent_id, "in_progress", f"Research started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Initialize research agent
        research_agent = SEResearchAgent(model=model)
        
        # Run research
        result = await research_agent.research_agent(agent_name)
        
        # Save result
        output_dir = Path("outputs")
        output_dir.mkdir(exist_ok=True)
        output_file = output_dir / f"{agent_name.replace(' ', '_')}.json"
        
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        
        # Count quality metrics
        issues_count = 0
        references_count = 0
        
        if isinstance(result, dict):
            se_practices = result.get("SE_Practices", {})
            bug_solving = se_practices.get("Bug_Solving_Approaches", {})
            issues = bug_solving.get("Issues", [])
            issues_count = len(issues)
            
            references = result.get("References", {})
            references_count = len(references)
        
        # Update status to completed
        notes = f"Research completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {references_count} references, {issues_count} issues"
        update_agent_status(agent_id, "completed", notes)
        
        print(f"\n{'='*70}")
        print(f"✅ Research completed successfully!")
        print(f"📄 Saved to: {output_file}")
        print(f"📊 Output size: {len(json.dumps(result)):,} characters")
        print(f"\n📋 Quality Metrics:")
        print(f"   Issues analyzed: {issues_count}")
        print(f"   References collected: {references_count}")
        
        if references_count < 10:
            print(f"   Data quality: ⚠️  Limited (target: 15-20 references)")
        elif references_count < 15:
            print(f"   Data quality: 👍 Good")
        else:
            print(f"   Data quality: ✅ Excellent")
        
        print(f"\n✅ Updated agents_config.json status to 'completed'")
        print(f"{'='*70}\n")
        
    except Exception as e:
        print(f"\n❌ Research failed: {e}")
        update_agent_status(agent_id, "failed", f"Failed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}: {str(e)}")
        raise


async def research_agent_by_name(agent_name: str, model: str = "gpt-4o"):
    """Research a specific agent by name"""
    config = load_config()
    
    # Find agent
    target_agent = None
    for agent in config:
        if agent['agent_name'].lower() == agent_name.lower():
            target_agent = agent
            break
    
    if not target_agent:
        print(f"❌ Agent '{agent_name}' not found in config!")
        print(f"\nAvailable agents:")
        for agent in config:
            print(f"   - {agent['agent_name']} (ID: {agent['id']}, Status: {agent['status']})")
        return
    
    await research_agent_by_id(target_agent['id'], model)


async def research_all_pending(model: str = "gpt-4o"):
    """Research all agents with status 'pending' or 'failed'"""
    config = load_config()
    
    pending_agents = [a for a in config if a['status'] in ['pending', 'failed']]
    
    if not pending_agents:
        print("✅ No pending agents to research!")
        return
    
    print(f"📋 Found {len(pending_agents)} pending/failed agents:")
    for agent in pending_agents:
        print(f"   - {agent['agent_name']} (ID: {agent['id']}, Status: {agent['status']})")
    
    print(f"\n🚀 Starting batch research...\n")
    
    for agent in pending_agents:
        await research_agent_by_id(agent['id'], model)
        print(f"\n{'─'*70}\n")


def list_agents():
    """List all agents in config"""
    config = load_config()
    
    print(f"\n{'='*70}")
    print(f"📋 Agents Configuration")
    print(f"{'='*70}\n")
    
    for agent in config:
        status_emoji = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'failed': '❌'
        }.get(agent['status'], '❓')
        
        print(f"{status_emoji} [{agent['id']}] {agent['agent_name']}")
        print(f"   Status: {agent['status']}")
        print(f"   Priority: {agent.get('priority', 'N/A')}")
        if agent.get('notes'):
            print(f"   Notes: {agent['notes']}")
        print()


def main():
    """Main CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generic research runner for SE Indexing Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # List all agents
  python run_research.py --list
  
  # Research specific agent by ID
  python run_research.py --id 1
  
  # Research specific agent by name
  python run_research.py --name "Glean Agents"
  
  # Research all pending/failed agents
  python run_research.py --all
  
  # Use specific model
  python run_research.py --name "Glean Agents" --model gpt-4o
        """
    )
    
    parser.add_argument('--list', action='store_true', help='List all agents in config')
    parser.add_argument('--id', type=int, help='Research agent by ID')
    parser.add_argument('--name', type=str, help='Research agent by name')
    parser.add_argument('--all', action='store_true', help='Research all pending/failed agents')
    parser.add_argument('--model', type=str, default='gpt-4o', 
                       help='OpenAI model to use (default: gpt-4o)')
    
    args = parser.parse_args()
    
    if args.list:
        list_agents()
    elif args.id:
        asyncio.run(research_agent_by_id(args.id, args.model))
    elif args.name:
        asyncio.run(research_agent_by_name(args.name, args.model))
    elif args.all:
        asyncio.run(research_all_pending(args.model))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
