"""
Agent Configuration Manager
Utility to manage agents_config.json
"""
import json
from pathlib import Path
from config import AGENTS_CONFIG_FILE


def load_config():
    """Load agents configuration"""
    with open(AGENTS_CONFIG_FILE, 'r') as f:
        return json.load(f)


def save_config(config):
    """Save agents configuration"""
    with open(AGENTS_CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def add_agent(agent_name: str, priority: int = None):
    """Add a new agent to config"""
    config = load_config()
    
    # Get next ID
    max_id = max([a.get('id', 0) for a in config], default=0)
    new_id = max_id + 1
    
    # Get next priority if not specified
    if priority is None:
        max_priority = max([a.get('priority', 0) for a in config], default=0)
        priority = max_priority + 1
    
    new_agent = {
        "id": new_id,
        "agent_name": agent_name,
        "status": "pending",
        "priority": priority
    }
    
    config.append(new_agent)
    save_config(config)
    print(f"✓ Added: {agent_name} (ID: {new_id}, Priority: {priority})")


def reset_agent(agent_id: int):
    """Reset agent status to pending"""
    config = load_config()
    
    for agent in config:
        if agent.get('id') == agent_id:
            agent['status'] = 'pending'
            if 'last_updated' in agent:
                del agent['last_updated']
            save_config(config)
            print(f"✓ Reset: {agent.get('agent_name')} to pending")
            return
    
    print(f"✗ Agent ID {agent_id} not found")


def reset_all():
    """Reset all agents to pending"""
    config = load_config()
    
    for agent in config:
        agent['status'] = 'pending'
        if 'last_updated' in agent:
            del agent['last_updated']
    
    save_config(config)
    print(f"✓ Reset all {len(config)} agents to pending")


def list_agents(status_filter: str = None):
    """List all agents, optionally filtered by status"""
    config = load_config()
    
    if status_filter:
        config = [a for a in config if a.get('status') == status_filter]
    
    print(f"\nAgents ({len(config)}):")
    print("-" * 80)
    
    for agent in sorted(config, key=lambda x: x.get('priority', 999)):
        status = agent.get('status', 'unknown')
        status_emoji = {
            'pending': '⏳',
            'in-progress': '🔄',
            'completed': '✅',
            'failed': '❌',
            'needs_review': '⚠️'
        }.get(status, '❓')
        
        print(f"{status_emoji} ID:{agent.get('id'):3d} | Pri:{agent.get('priority'):3d} | "
              f"{status:15s} | {agent.get('agent_name')}")
    
    print("-" * 80)


def get_stats():
    """Show statistics"""
    config = load_config()
    
    stats = {}
    for agent in config:
        status = agent.get('status', 'unknown')
        stats[status] = stats.get(status, 0) + 1
    
    print("\nStatistics:")
    print("-" * 40)
    print(f"Total Agents:     {len(config)}")
    for status, count in sorted(stats.items()):
        print(f"{status:15s}: {count}")
    print("-" * 40)


def add_bulk_agents(agent_names: list):
    """Add multiple agents at once"""
    for idx, name in enumerate(agent_names, 1):
        add_agent(name)
    print(f"\n✓ Added {len(agent_names)} agents")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("\nAgent Configuration Manager")
        print("\nUsage:")
        print('  python manage_agents.py add "Agent Name"')
        print('  python manage_agents.py reset <agent_id>')
        print('  python manage_agents.py reset-all')
        print('  python manage_agents.py list [status]')
        print('  python manage_agents.py stats')
        print('\nExamples:')
        print('  python manage_agents.py add "Claude Code"')
        print('  python manage_agents.py reset 5')
        print('  python manage_agents.py list pending')
        print('  python manage_agents.py list completed')
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'add' and len(sys.argv) >= 3:
        add_agent(sys.argv[2])
    elif command == 'reset' and len(sys.argv) >= 3:
        reset_agent(int(sys.argv[2]))
    elif command == 'reset-all':
        reset_all()
    elif command == 'list':
        status = sys.argv[2] if len(sys.argv) >= 3 else None
        list_agents(status)
    elif command == 'stats':
        get_stats()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
